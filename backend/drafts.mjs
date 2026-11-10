import { createShop, saveStory, updateShop } from './data.mjs';

const columns = 'kind, slug, language, payload, revision, saved_at AS "savedAt"';

export async function listDrafts(db, { limit, offset }) {
  return (
    await db.query(
      `SELECT ${columns} FROM rtsm_content_draft ORDER BY kind, slug, language LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
  ).rows;
}

export async function storyEditorVersions(db, slug) {
  const { rows } = await db.query(
    `SELECT COALESCE(d.language, s.language) AS language, s.slug, d.slug AS "draftSlug",
       s.title, s.summary, s.category, s.blocks, s.cover_image_url AS "coverImageUrl",
       s.cover_image_alt AS "coverImageAlt", s.source_url AS "sourceUrl",
       s.source_published_at AS "sourcePublishedAt",
       COALESCE(s.published_at <= now() AND (s.expires_at IS NULL OR s.expires_at > now()), false) AS visible,
       d.payload, d.revision AS "draftRevision"
     FROM (SELECT * FROM rtsm_story WHERE slug = $1) s
     FULL JOIN (SELECT * FROM rtsm_content_draft WHERE kind = 'story' AND slug = $1) d USING (language)
     ORDER BY language DESC`,
    [slug],
  );
  return rows.map(({ payload, draftSlug, ...version }) => ({
    ...version,
    ...payload,
    slug: draftSlug ?? version.slug,
    visible: version.visible,
  }));
}

export async function readDraft(db, { kind, slug, language }, lock = false) {
  return (
    await db.query(
      `SELECT ${columns} FROM rtsm_content_draft WHERE kind = $1 AND slug = $2 AND language = $3
     ${lock ? 'FOR UPDATE' : ''}`,
      [kind, slug, language],
    )
  ).rows[0];
}

export async function saveDraft(db, { kind, slug, language, payload, revision, newRecord }) {
  // A null revision creates a first draft. An existing draft requires its exact revision.
  const params = [kind, slug, language, JSON.stringify(payload), revision, newRecord];
  const { rows } = await db.query(
    `WITH updated AS (
      UPDATE rtsm_content_draft SET payload = $4, revision = gen_random_uuid(), saved_at = now()
      WHERE kind = $1 AND slug = $2 AND language = $3 AND revision = $5::uuid
      RETURNING ${columns}
    ), inserted AS (
      INSERT INTO rtsm_content_draft (kind, slug, language, payload)
      SELECT $1, $2, $3, $4 WHERE $5::uuid IS NULL AND (NOT $6::boolean OR
        CASE WHEN $1 = 'shop' THEN NOT EXISTS (SELECT 1 FROM rtsm_shop WHERE slug = $2)
        ELSE NOT EXISTS (SELECT 1 FROM rtsm_story WHERE slug = $2)
          AND NOT EXISTS (SELECT 1 FROM rtsm_content_draft WHERE kind = 'story' AND slug = $2) END)
      ON CONFLICT DO NOTHING RETURNING ${columns}
    ) SELECT * FROM updated UNION ALL SELECT * FROM inserted`,
    params,
  );
  return rows[0];
}

export async function saveStoryDrafts(db, entries) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [entries[0].slug]);
    const saved = [];
    for (const entry of entries) {
      const result = await saveDraft(client, {
        ...entry,
        newRecord: entry.newRecord && saved.length === 0,
      });
      if (!result) {
        await client.query('ROLLBACK');
        return undefined;
      }
      saved.push(result);
    }
    await client.query('COMMIT');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function publishDraft(db, key, revision) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const draft = await readDraft(client, key, true);
    if (!draft || draft.revision !== revision) {
      await client.query('ROLLBACK');
      return undefined;
    }
    const payload = { ...draft.payload, visible: true };
    const live =
      key.kind === 'shop'
        ? ((await updateShop(client, { ...payload, slug: key.slug })) ??
          (await createShop(client, { ...payload, slug: key.slug })))
        : await saveStory(client, key, payload);
    await client.query(
      'DELETE FROM rtsm_content_draft WHERE kind = $1 AND slug = $2 AND language = $3',
      [key.kind, key.slug, key.language],
    );
    await client.query('COMMIT');
    return live;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
