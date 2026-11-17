import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { prepareCatalog, summary } from './lib/catalog-import.mjs';
const plan = await prepareCatalog();
const ddl = await readFile(new URL('../src/server/db/shared-schema.sql', import.meta.url), 'utf8');
// Dollar quoting preserves Unicode, apostrophes, newlines and backslashes exactly.
function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid SQL number');
    return String(value);
  }
  const text = String(value);
  const tag = `$rtsm_${createHash('sha256').update(text).digest('hex').slice(0, 16)}$`;
  if (text.includes(tag)) throw new Error('SQL quote delimiter collision');
  return tag + text + tag;
}
const shops = plan.shops.map(
  (shop) =>
    `(${[
      shop.id,
      shop.name,
      shop.kind,
      shop.address,
      shop.city,
      shop.country,
      shop.lat,
      shop.lng,
      shop.description.it,
      shop.description.en,
      shop.oven,
      shop.website ?? null,
      shop.image,
      shop.imageAlt?.it ?? null,
      shop.imageAlt?.en ?? null,
    ]
      .map(literal)
      .join(
        ',',
      )},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,${shop.published ? 'CURRENT_TIMESTAMP' : 'NULL'},${literal(JSON.stringify({ ...shop, importSource: 'bundled-catalog', importDigest: plan.digest }))}::jsonb)`,
);
const stories = plan.stories.map(
  (story) =>
    `(${[story.slug, story.language, story.title, story.summary, story.category]
      .map(literal)
      .join(',')},${literal(JSON.stringify(story.blocks))}::jsonb,${[
      story.coverImageUrl,
      story.cover.alt,
      story.sourceUrl,
      story.sourcePublishedAt,
    ]
      .map(literal)
      .join(
        ',',
      )},CURRENT_TIMESTAMP,${story.published ? 'CURRENT_TIMESTAMP' : 'NULL'},${literal(JSON.stringify({ readMinutes: story.readMinutes, cover: story.cover, publishedAt: story.publishedAt, importSource: 'bundled-catalog', importDigest: plan.digest }))}::jsonb)`,
);
const sql = `-- RoadToSmartBaking: create four content tables and import the bundled catalog.
-- Run this ENTIRE file in your intended PostgreSQL database as a schema owner.
-- No database is created or selected by this script. Check the connection first.
-- Existing records are skipped, including their edits, drafts and visibility.
-- Source: ${plan.digest}
-- 43 shops (42 public, Desdott hidden), 63 Italian stories. No English translations are fabricated.
-- Image files must also be deployed from this project's public directory.
-- This does NOT configure application credentials, staff login or Amplify.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
CREATE SCHEMA IF NOT EXISTS road_to_smartbaking;
SET LOCAL search_path TO road_to_smartbaking, pg_catalog;
SELECT pg_advisory_xact_lock(hashtext('rtsm:catalog-import:road_to_smartbaking'));

DO $install$
DECLARE existing_count integer;
BEGIN
  SELECT count(*) INTO existing_count FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='road_to_smartbaking' AND c.relkind IN ('r','p')
    AND c.relname IN ('rtsm_shop','rtsm_story','rtsm_requests','rtsm_reports');
  IF existing_count=0 THEN
    EXECUTE ${literal(ddl)};
  ELSIF existing_count<>4 THEN
    RAISE EXCEPTION 'Only some RTSM tables exist. No import applied: review the existing schema first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='road_to_smartbaking' AND table_name='rtsm_shop' AND column_name='draft_payload')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='road_to_smartbaking' AND table_name='rtsm_story' AND column_name='draft_payload') THEN
    RAISE EXCEPTION 'Existing RTSM schema needs the embedded-draft upgrade. No import applied.';
  END IF;
END
$install$;

INSERT INTO road_to_smartbaking.rtsm_shop
(slug,name,category,address,city,country,latitude,longitude,description_it,description_en,
 oven_model,website_url,image_url,image_alt_it,image_alt_en,verified_at,approved_at,published_at,frontend_source)
VALUES
${shops.join(',\n')}
ON CONFLICT (slug) DO NOTHING;

INSERT INTO road_to_smartbaking.rtsm_story
(slug,language,title,summary,category,blocks,cover_image_url,cover_image_alt,source_url,
 source_published_at,approved_at,published_at,frontend_source)
VALUES
${stories.join(',\n')}
ON CONFLICT (slug,language) DO NOTHING;

COMMIT;

-- Fresh database expected result: 43 shops, 42 public shops, 63 stories, 63 Italian, 0 English.
-- If staff already edited this database, their counts/publication decisions are preserved.
SELECT current_database() AS database,
 (SELECT count(*) FROM road_to_smartbaking.rtsm_shop) AS shops,
 (SELECT count(*) FROM road_to_smartbaking.rtsm_shop WHERE published_at<=now() AND suspended_at IS NULL) AS public_shops,
 (SELECT count(*) FROM road_to_smartbaking.rtsm_story) AS stories,
 (SELECT count(*) FROM road_to_smartbaking.rtsm_story WHERE language='it') AS italian_stories,
 (SELECT count(*) FROM road_to_smartbaking.rtsm_story WHERE language='en') AS english_stories;
`;
const output = new URL(
  '../docs/imports/setup-and-populate-road-to-smartbaking.sql',
  import.meta.url,
);
await writeFile(output, sql);
console.log(JSON.stringify({ file: output.pathname, ...summary(plan) }, null, 2));
