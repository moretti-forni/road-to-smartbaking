// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import {
  prepareCatalog,
  summary,
  importCatalog,
  catalogCounts,
} from '../scripts/lib/catalog-import.mjs';
import { getStory, getShop } from '../src/server/repositories/catalog.mjs';
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('controlled catalog import', () => {
  const schema = `import_test_${randomUUID().replaceAll('-', '')}`;
  let db: pg.Client;
  let plan: Awaited<ReturnType<typeof prepareCatalog>>;
  let expectedDatabase: string;
  beforeAll(async () => {
    plan = await prepareCatalog();
    db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await db.connect();
    expectedDatabase = (await db.query('SELECT current_database() AS name')).rows[0].name;
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`SET search_path TO "${schema}"`);
    await db.query(await readFile('src/server/db/shared-schema.sql', 'utf8'));
  });
  afterAll(async () => {
    if (db) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.end();
    }
  });
  it('imports the real source with publication, language, dates, and bundled image paths intact', async () => {
    expect(summary(plan)).toMatchObject({
      shops: 43,
      publishedShops: 42,
      hiddenShops: ['desdott'],
      stories: 63,
      storyLanguages: { it: 63 },
    });
    const result = await importCatalog(db, schema, plan, { expectedDatabase });
    expect(result.after).toEqual({
      shops: 43,
      publicShops: 42,
      stories: 63,
      publicStories: 63,
      requests: 0,
      reports: 0,
    });
    expect(result.inserted.shops).toHaveLength(43);
    expect(result.inserted.stories).toHaveLength(63);
    expect(await getShop(db, 'desdott')).toBeUndefined();
    const first = plan.stories[0];
    const stored = await getStory(db, { slug: first.slug, language: 'it' });
    expect(stored.blocks).toEqual(first.blocks);
    expect(stored.coverImageUrl).toBe(first.coverImageUrl);
    expect(new Date(stored.sourcePublishedAt).toISOString()).toBe(first.sourcePublishedAt);
    expect(await getStory(db, { slug: first.slug, language: 'en' })).toBeUndefined();
    const descriptions = (
      await db.query(
        `SELECT count(*)::int AS count FROM "${schema}".rtsm_shop WHERE length(description_it)>0 AND length(description_en)>0`,
      )
    ).rows[0].count;
    expect(descriptions).toBe(43);
  });
  it('is idempotent and preserves staff edits, visibility and saved drafts', async () => {
    const revision = randomUUID();
    await db.query(
      `UPDATE "${schema}".rtsm_shop SET name='Staff edit', published_at=NULL, draft_payload='{"name":"Private draft"}',draft_revision=$1,draft_saved_at=now() WHERE slug=$2`,
      [revision, plan.shops[0].id],
    );
    await db.query(
      `UPDATE "${schema}".rtsm_story SET title='Staff story edit',published_at=NULL WHERE slug=$1 AND language='it'`,
      [plan.stories[0].slug],
    );
    const before = (
      await db.query(`SELECT to_jsonb(s) AS record FROM "${schema}".rtsm_shop s ORDER BY slug`)
    ).rows;
    const result = await importCatalog(db, schema, plan, { expectedDatabase });
    expect(result.skipped).toEqual({ shops: 43, stories: 63 });
    expect(result.inserted.shops).toHaveLength(0);
    expect(result.inserted.stories).toHaveLength(0);
    expect(
      (await db.query(`SELECT to_jsonb(s) AS record FROM "${schema}".rtsm_shop s ORDER BY slug`))
        .rows,
    ).toEqual(before);
    expect(
      (
        await db.query(
          `SELECT title,published_at FROM "${schema}".rtsm_story WHERE slug=$1 AND language='it'`,
          [plan.stories[0].slug],
        )
      ).rows[0],
    ).toEqual({ title: 'Staff story edit', published_at: null });
  });
  it('rolls back all inserts on failure and refuses a mismatched database', async () => {
    const before = await catalogCounts(db, schema);
    await expect(
      importCatalog(db, schema, plan, { expectedDatabase: 'wrong-database' }),
    ).rejects.toThrow('explicit import target');
    const broken = {
      ...plan,
      shops: [{ ...plan.shops[0], id: 'rollback-shop' }],
      stories: [{ ...plan.stories[0], slug: 'rollback-story', title: null }],
    };
    await expect(importCatalog(db, schema, broken, { expectedDatabase })).rejects.toThrow();
    expect(await catalogCounts(db, schema)).toEqual(before);
    expect(
      (await db.query(`SELECT 1 FROM "${schema}".rtsm_shop WHERE slug='rollback-shop'`)).rowCount,
    ).toBe(0);
  });
});
