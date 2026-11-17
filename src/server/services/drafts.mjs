import { createShop, saveStory, updateShop } from '../repositories/catalog.mjs';

// Table names come exclusively from this fixed map, never from request input.
const tables = { shop: 'rtsm_shop', story: 'rtsm_story' };
function tableFor(kind) {
  if (!tables[kind]) throw new Error('Unknown draft kind');
  return tables[kind];
}
function columns(kind) {
  return `'${kind}' AS kind, slug, ${kind === 'shop' ? "''" : 'language'} AS language,
    draft_payload AS payload, draft_revision AS revision, draft_saved_at AS "savedAt"`;
}
export async function listDrafts(db, { limit, offset }) {
  return (
    await db.query(
      `SELECT * FROM (
    SELECT ${columns('shop')} FROM rtsm_shop WHERE draft_payload IS NOT NULL
    UNION ALL SELECT ${columns('story')} FROM rtsm_story WHERE draft_payload IS NOT NULL
  ) drafts ORDER BY kind, slug, language LIMIT $1 OFFSET $2`,
      [limit, offset],
    )
  ).rows;
}
export async function storyEditorVersions(db, slug) {
  const { rows } = await db.query(
    `SELECT language, slug, title, summary, category, blocks,
    cover_image_url AS "coverImageUrl", cover_image_alt AS "coverImageAlt", source_url AS "sourceUrl",
    source_published_at AS "sourcePublishedAt",
    COALESCE(published_at <= now() AND (expires_at IS NULL OR expires_at > now()), false) AS visible,
    draft_payload AS payload, draft_revision AS "draftRevision"
    FROM rtsm_story WHERE slug = $1 ORDER BY language DESC`,
    [slug],
  );
  return rows.map(({ payload, ...version }) => ({
    ...version,
    ...payload,
    visible: version.visible,
  }));
}
export async function readDraft(db, { kind, slug, language }, lock = false) {
  return (
    await db.query(
      `SELECT ${columns(kind)} FROM ${tableFor(kind)}
    WHERE slug = $1 ${kind === 'story' ? 'AND language = $2' : ''} AND draft_payload IS NOT NULL
    ${lock ? 'FOR UPDATE' : ''}`,
      kind === 'story' ? [slug, language] : [slug],
    )
  ).rows[0];
}
async function saveOnClient(db, { kind, slug, language, payload, revision, newRecord }) {
  const table = tableFor(kind);
  // Lock both first saves and updates, including a slug with no row yet.
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${kind}:${slug}`]);
  const existing = (await db.query(`SELECT id FROM ${table} WHERE slug = $1 LIMIT 1`, [slug]))
    .rows[0];
  if (newRecord && existing) return undefined;
  const row = (
    await db.query(
      `SELECT id FROM ${table} WHERE slug = $1 ${kind === 'story' ? 'AND language = $2' : ''}`,
      kind === 'story' ? [slug, language] : [slug],
    )
  ).rows[0];
  if (!row) {
    if (revision !== null) return undefined;
    // New rows contain valid initial content but remain private until publication.
    if (kind === 'shop') await createShop(db, { ...payload, slug, visible: false });
    else await saveStory(db, { slug, language }, { ...payload, visible: false }, true);
  }
  return (
    await db.query(
      `UPDATE ${table} SET draft_payload = $2, draft_revision = gen_random_uuid(),
    draft_saved_at = now() WHERE slug = $1 AND draft_revision IS NOT DISTINCT FROM $3::uuid
    ${kind === 'story' ? 'AND language = $4' : ''} RETURNING ${columns(kind)}`,
      [slug, JSON.stringify(payload), revision, ...(kind === 'story' ? [language] : [])],
    )
  ).rows[0];
}
export async function saveDraft(db, input) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const saved = await saveOnClient(client, input);
    await client.query(saved ? 'COMMIT' : 'ROLLBACK');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveStoryDrafts(db, entries) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [entries[0].slug]);
    const saved = [];
    for (const entry of entries) {
      const result = await saveOnClient(client, {
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
      `UPDATE ${tableFor(key.kind)} SET draft_payload = NULL, draft_revision = NULL, draft_saved_at = NULL
       WHERE slug = $1 ${key.kind === 'story' ? 'AND language = $2' : ''}`,
      key.kind === 'story' ? [key.slug, key.language] : [key.slug],
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
