import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';
import { restaurants, restaurantSchema, shopImage } from '../../src/data/restaurants.ts';
import { stories } from '../../src/data/content.ts';
import { imageUrl } from '../../src/data/story-index.ts';

const sourceRoot = new URL('../../', import.meta.url);
const publicRoot = resolve(new URL('public/', sourceRoot).pathname);
function localMediaPath(path) {
  if (/^https?:\/\//.test(path)) {
    const url = new URL(path);
    if (url.pathname.startsWith('/media/catalog/'))
      return decodeURI(url.pathname.slice('/media/catalog'.length));
  }
  return path;
}
function unique(records, key) {
  const keys = records.map(key);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate source catalog keys');
}
export async function prepareCatalog() {
  unique(restaurants, (shop) => shop.id);
  unique(stories, (story) => `${story.slug}:${story.language}`);
  const files = await readdir(new URL('public/media/', sourceRoot));
  const images = new Set(files);
  const paths = new Set();
  const shops = restaurants.map((record) => {
    const shop = restaurantSchema.parse(record);
    if (!shop.id || !shop.name.trim() || !shop.description.it.trim() || !shop.description.en.trim())
      throw new Error(`Incomplete shop: ${shop.id}`);
    const country = shop.address.startsWith('Location lookup: Amsterdam')
      ? 'Netherlands'
      : shop.address.startsWith('1300 East Coast Parkway, Singapore')
        ? 'Singapore'
        : shop.address.split(',').at(-1).trim();
    if (!country) throw new Error(`Missing country: ${shop.id}`);
    paths.add(shop.image);
    paths.add(localMediaPath(shopImage(shop.image, 'cards')));
    paths.add(localMediaPath(shopImage(shop.image, 'heroes')));
    return { ...shop, country, published: shop.isPublished !== false };
  });
  function bundledImage(id) {
    const path = localMediaPath(imageUrl(id));
    if (!path.startsWith('/media/') || !images.has(path.slice('/media/'.length)))
      throw new Error(`Missing bundled story image: ${id}`);
    paths.add(path);
    return path;
  }
  const articles = stories.map((story) => {
    if (
      !['it', 'en'].includes(story.language) ||
      !story.title.trim() ||
      !story.summary.trim() ||
      !story.blocks.length
    )
      throw new Error(`Invalid story: ${story.slug}`);
    const date = story.publishedAt ? new Date(`${story.publishedAt} UTC`) : null;
    if (date && Number.isNaN(date.valueOf())) throw new Error(`Invalid source date: ${story.slug}`);
    return {
      ...story,
      sourcePublishedAt: date?.toISOString() ?? null,
      // This snapshot is the existing published editorial catalog, not the private Studio drafts.
      published: true,
      coverImageUrl: bundledImage(story.cover.image),
      blocks: story.blocks.map((block) =>
        block.type === 'image' ? { ...block, image: bundledImage(block.image) } : block,
      ),
    };
  });
  for (const path of paths) {
    if (!path.startsWith('/')) throw new Error(`Expected bundled image: ${path}`);
    const filename = resolve(publicRoot, path.slice(1));
    if (!filename.startsWith(publicRoot + sep))
      throw new Error('Image path escapes public directory');
    const metadata = await sharp(await readFile(filename)).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Invalid image: ${path}`);
  }
  const digest = createHash('sha256')
    .update(JSON.stringify({ shops, stories: articles }))
    .digest('hex');
  return { shops, stories: articles, imagePaths: [...paths].sort(), digest };
}
export function summary(plan) {
  return {
    sourceDigest: plan.digest,
    shops: plan.shops.length,
    publishedShops: plan.shops.filter((shop) => shop.published).length,
    hiddenShops: plan.shops.filter((shop) => !shop.published).map((shop) => shop.id),
    stories: plan.stories.length,
    storyLanguages: plan.stories.reduce(
      (counts, story) => ({ ...counts, [story.language]: (counts[story.language] ?? 0) + 1 }),
      {},
    ),
    verifiedLocalImages: plan.imagePaths.length,
    englishStoryFallback: 'Italian originals; no English translations exist in the source snapshot',
  };
}
function schemaName(schema) {
  if (
    !/^[a-z][a-z0-9_]{0,62}$/.test(schema) ||
    schema === 'public' ||
    schema === 'information_schema' ||
    schema.startsWith('pg_')
  )
    throw new Error('Use a dedicated application schema');
  return `"${schema}"`;
}
export async function catalogCounts(db, schema) {
  const name = schemaName(schema);
  return (
    await db.query(`SELECT
    (SELECT count(*)::int FROM ${name}.rtsm_shop) AS shops,
    (SELECT count(*)::int FROM ${name}.rtsm_shop WHERE published_at <= now() AND suspended_at IS NULL) AS "publicShops",
    (SELECT count(*)::int FROM ${name}.rtsm_story) AS stories,
    (SELECT count(*)::int FROM ${name}.rtsm_story WHERE published_at <= now() AND (expires_at IS NULL OR expires_at > now())) AS "publicStories",
    (SELECT count(*)::int FROM ${name}.rtsm_requests) AS requests,
    (SELECT count(*)::int FROM ${name}.rtsm_reports) AS reports`)
  ).rows[0];
}
export async function verifyCatalog(db, schema, plan) {
  const name = schemaName(schema);
  const shops = (
    await db.query(
      `SELECT slug,name,category,address,city,country,latitude,longitude,
    description_it,description_en,oven_model,website_url,image_url,image_alt_it,image_alt_en,
    COALESCE(published_at <= now() AND suspended_at IS NULL,false) AS published
    FROM ${name}.rtsm_shop WHERE slug = ANY($1::text[])`,
      [plan.shops.map((shop) => shop.id)],
    )
  ).rows;
  const stories = (
    await db.query(
      `SELECT slug,language,title,summary,category,blocks,cover_image_url,cover_image_alt,source_url,source_published_at,
    COALESCE(published_at <= now() AND (expires_at IS NULL OR expires_at > now()),false) AS published
    FROM ${name}.rtsm_story WHERE slug = ANY($1::text[])`,
      [plan.stories.map((story) => story.slug)],
    )
  ).rows;
  const differences = { shops: [], stories: [] };
  for (const shop of plan.shops) {
    const expected = {
      slug: shop.id,
      name: shop.name,
      category: shop.kind,
      address: shop.address,
      city: shop.city,
      country: shop.country,
      latitude: shop.lat,
      longitude: shop.lng,
      description_it: shop.description.it,
      description_en: shop.description.en,
      oven_model: shop.oven,
      website_url: shop.website ?? null,
      image_url: shop.image,
      image_alt_it: shop.imageAlt?.it ?? null,
      image_alt_en: shop.imageAlt?.en ?? null,
      published: shop.published,
    };
    const row = shops.find((row) => row.slug === shop.id);
    if (!row || !isDeepStrictEqual(row, expected)) differences.shops.push(shop.id);
  }
  for (const story of plan.stories) {
    const expected = {
      slug: story.slug,
      language: story.language,
      title: story.title,
      summary: story.summary,
      category: story.category,
      blocks: story.blocks,
      cover_image_url: story.coverImageUrl,
      cover_image_alt: story.cover.alt,
      source_url: story.sourceUrl,
      source_published_at: story.sourcePublishedAt,
      published: story.published,
    };
    const row = stories.find((row) => row.slug === story.slug && row.language === story.language);
    const normalized = row && {
      ...row,
      source_published_at: row.source_published_at?.toISOString() ?? null,
    };
    if (!normalized || !isDeepStrictEqual(normalized, expected))
      differences.stories.push(`${story.slug}:${story.language}`);
  }
  return {
    matchedShops: plan.shops.length - differences.shops.length,
    matchedStories: plan.stories.length - differences.stories.length,
    differences,
  };
}
export async function importCatalog(db, schema, plan, { expectedDatabase }) {
  const name = schemaName(schema);
  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SET LOCAL statement_timeout = '30s'");
    const actual = (await db.query('SELECT current_database() AS database')).rows[0].database;
    if (actual !== expectedDatabase)
      throw new Error('Connected database does not match the explicit import target');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`rtsm:catalog-import:${schema}`]);
    const before = await catalogCounts(db, schema);
    const inserted = { shops: [], stories: [] };
    for (const shop of plan.shops) {
      const result = await db.query(
        `INSERT INTO ${name}.rtsm_shop
        (slug,name,category,address,city,country,latitude,longitude,description_it,description_en,
        oven_model,website_url,image_url,image_alt_it,image_alt_en,verified_at,approved_at,published_at,frontend_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),now(),CASE WHEN $16 THEN now() END,$17)
        ON CONFLICT (slug) DO NOTHING RETURNING id,slug`,
        [
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
          shop.published,
          JSON.stringify({ ...shop, importSource: 'bundled-catalog', importDigest: plan.digest }),
        ],
      );
      inserted.shops.push(...result.rows);
    }
    for (const story of plan.stories) {
      const result = await db.query(
        `INSERT INTO ${name}.rtsm_story
        (slug,language,title,summary,category,blocks,cover_image_url,cover_image_alt,source_url,source_published_at,
        approved_at,published_at,frontend_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),CASE WHEN $11 THEN now() END,$12)
        ON CONFLICT (slug,language) DO NOTHING RETURNING id,slug,language`,
        [
          story.slug,
          story.language,
          story.title,
          story.summary,
          story.category,
          JSON.stringify(story.blocks),
          story.coverImageUrl,
          story.cover.alt,
          story.sourceUrl,
          story.sourcePublishedAt,
          story.published,
          JSON.stringify({
            readMinutes: story.readMinutes,
            cover: story.cover,
            publishedAt: story.publishedAt,
            importSource: 'bundled-catalog',
            importDigest: plan.digest,
          }),
        ],
      );
      inserted.stories.push(...result.rows);
    }
    const after = await catalogCounts(db, schema);
    if (
      after.shops - before.shops !== inserted.shops.length ||
      after.stories - before.stories !== inserted.stories.length ||
      after.requests !== before.requests ||
      after.reports !== before.reports
    )
      throw new Error('Import count verification failed');
    const verification = await verifyCatalog(db, schema, plan);
    if (
      inserted.shops.some((shop) => verification.differences.shops.includes(shop.slug)) ||
      inserted.stories.some((story) =>
        verification.differences.stories.includes(`${story.slug}:${story.language}`),
      )
    )
      throw new Error('Inserted content failed source comparison');
    await db.query('COMMIT');
    return {
      verification,
      before,
      after,
      inserted,
      skipped: {
        shops: plan.shops.length - inserted.shops.length,
        stories: plan.stories.length - inserted.stories.length,
      },
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
