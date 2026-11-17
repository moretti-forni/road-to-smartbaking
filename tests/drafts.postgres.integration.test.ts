// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import {
  saveDraft,
  readDraft,
  publishDraft,
  saveStoryDrafts,
  listDrafts,
} from '../src/server/services/drafts.mjs';
import { getShop, getStory } from '../src/server/repositories/catalog.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('four-table embedded drafts', () => {
  const schema = `draft_test_${randomUUID().replaceAll('-', '')}`;
  let admin: pg.Client;
  let db: pg.Pool;
  const shop = {
    slug: 'test-shop',
    name: 'Live shop',
    category: 'pizza',
    address: 'Street 1',
    city: 'Roma',
    country: 'Italy',
    latitude: 41,
    longitude: 12,
  };
  const story = {
    title: 'First story',
    summary: 'Summary',
    category: 'pizza',
    blocks: [{ type: 'paragraph', text: 'Body' }],
  };
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    db = new pg.Pool({ connectionString: url.href });
    await db.query(await readFile('src/server/db/shared-schema.sql', 'utf8'));
  });
  afterAll(async () => {
    await db?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });
  it('creates exactly the agreed four tables', async () => {
    const tables = (
      await db.query('SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename', [
        schema,
      ])
    ).rows.map((row) => row.tablename);
    expect(tables).toEqual(['rtsm_reports', 'rtsm_requests', 'rtsm_shop', 'rtsm_story']);
  });
  it('keeps new shops private; publishes once; saves edits without changing the live row or ID', async () => {
    const draft = await saveDraft(db, {
      kind: 'shop',
      slug: shop.slug,
      language: '',
      payload: shop,
      revision: null,
      newRecord: true,
    });
    expect(draft.revision).toBeTruthy();
    expect(await getShop(db, shop.slug)).toBeUndefined();
    const live = await publishDraft(
      db,
      { kind: 'shop', slug: shop.slug, language: '' },
      draft.revision,
    );
    expect(live.name).toBe('Live shop');
    expect(await readDraft(db, draft)).toBeUndefined();
    const edit = await saveDraft(db, {
      ...draft,
      payload: { ...shop, name: 'Edited shop' },
      revision: null,
      newRecord: false,
    });
    expect((await getShop(db, shop.slug)).name).toBe('Live shop');
    expect(
      await saveDraft(db, { ...edit, payload: shop, revision: randomUUID(), newRecord: false }),
    ).toBeUndefined();
    expect(await publishDraft(db, draft, draft.revision)).toBeUndefined();
    const published = await publishDraft(db, edit, edit.revision);
    expect(published.id).toBe(live.id);
    expect(published.name).toBe('Edited shop');
    expect(await publishDraft(db, edit, edit.revision)).toBeUndefined();
  });
  it('saves bilingual drafts atomically, preserves translations, and isolates public stories', async () => {
    const entries = ['it', 'en'].map((language) => ({
      kind: 'story',
      slug: 'test-story',
      language,
      payload: story,
      revision: null,
      newRecord: true,
    }));
    const saved = await saveStoryDrafts(db, entries);
    expect(saved).toHaveLength(2);
    if (!saved) throw new Error('Draft batch failed');
    expect(await getStory(db, entries[0])).toBeUndefined();
    await publishDraft(db, saved[0], saved[0].revision);
    const next = await saveStoryDrafts(db, [
      { ...entries[0], newRecord: false, payload: { ...story, title: 'Private edit' } },
    ]);
    if (!next) throw new Error('Draft update failed');
    expect((await getStory(db, entries[0])).title).toBe('First story');
    const failed = await saveStoryDrafts(db, [
      {
        ...entries[0],
        revision: next[0].revision,
        newRecord: false,
        payload: { ...story, title: 'Rolled back edit' },
      },
      { ...entries[1], revision: randomUUID(), newRecord: false },
    ]);
    expect(failed).toBeUndefined();
    expect((await readDraft(db, entries[0])).payload.title).toBe('Private edit');
    expect((await readDraft(db, entries[1])).revision).toBe(saved[1].revision);
    expect((await listDrafts(db, { limit: 100, offset: 0 })).length).toBe(2);
  });
  it('upgrades legacy draft-only records without losing payloads or revisions', async () => {
    const legacy = `${schema}_old`;
    await admin.query(`CREATE SCHEMA "${legacy}"`);
    const client = await db.connect();
    try {
      await client.query(`SET search_path TO "${legacy}"`);
      for (const name of [
        '001-initial-schema.sql',
        '002-frontend-import-metadata.sql',
        '003-content-drafts.sql',
        '004-venue-categories.sql',
        '005-venue-reports.sql',
        '006-staff-email-auth.sql',
      ]) {
        await client.query(await readFile(`src/server/db/migrations/${name}`, 'utf8'));
      }
      const revision = randomUUID();
      await client.query(
        "INSERT INTO rtsm_content_draft(kind, slug, language, payload, revision) VALUES ('shop', $1, '', $2, $3), ('story', 'legacy-story', 'it', $4, $5)",
        [shop.slug, JSON.stringify(shop), revision, JSON.stringify(story), randomUUID()],
      );
      await client.query('BEGIN');
      await client.query(
        await readFile('src/server/db/migrations/007-embedded-drafts.sql', 'utf8'),
      );
      await client.query('COMMIT');
      expect(
        (await readDraft(client, { kind: 'shop', slug: shop.slug, language: '' })).revision,
      ).toBe(revision);
      expect(
        (await readDraft(client, { kind: 'story', slug: 'legacy-story', language: 'it' })).payload
          .title,
      ).toBe(story.title);
      expect(await getShop(client, shop.slug)).toBeUndefined();
      expect(
        (await client.query("SELECT to_regclass('rtsm_content_draft') AS name")).rows[0].name,
      ).toBeNull();
    } finally {
      await client.query(`SET search_path TO "${schema}"`);
      client.release();
      await admin.query(`DROP SCHEMA "${legacy}" CASCADE`);
    }
  });
});
