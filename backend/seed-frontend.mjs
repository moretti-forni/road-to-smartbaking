import { readFile, readdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { restaurants, restaurantSchema } from '../app/data/restaurants.ts';

const { values } = parseArgs({ options: { 'local-demo': { type: 'boolean' } } });
const connection = new URL(
  process.env.DATABASE_URL ?? 'postgresql://rtsm:rtsm_local_only@127.0.0.1:5433/rtsm',
);
if (!values['local-demo'] || !['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) {
  throw new Error('Run with --local-demo and a loopback DATABASE_URL to import frontend fixtures.');
}

const snapshot = JSON.parse(
  await readFile(new URL('../app/data/stories.snapshot.json', import.meta.url), 'utf8'),
);
const filenames = await readdir(new URL('../public/media/', import.meta.url));
const images = new Map(filenames.map((file) => [file.slice(0, file.lastIndexOf('.')), file]));

function imagePath(id) {
  const filename = images.get(id);
  if (!filename) throw new Error(`Missing story image: ${id}`);
  return `/media/${filename}`;
}

const client = new pg.Client({ connectionString: connection.href, connectionTimeoutMillis: 3000 });
await client.connect();

try {
  await client.query('BEGIN');
  const migration = await readFile(
    new URL('../db/002-frontend-import-metadata.sql', import.meta.url),
    'utf8',
  );
  await client.query(migration);

  let shopsAdded = 0;
  let storiesAdded = 0;
  for (const fixture of restaurants) {
    const shop = restaurantSchema.parse(fixture);
    const country = shop.address.startsWith('Location lookup: Amsterdam')
      ? 'Netherlands'
      : shop.address.startsWith('1300 East Coast Parkway, Singapore')
        ? 'Singapore'
        : shop.address.split(',').at(-1).trim();
    const result = await client.query(
      `INSERT INTO rtsm_shop
        (slug, name, category, address, city, country, latitude, longitude, description_it,
         description_en, oven_model, image_url, verified_at, approved_at, published_at, frontend_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now(),
         CASE WHEN $13 THEN now() END,$14)
       ON CONFLICT (slug) DO NOTHING`,
      [
        shop.id,
        shop.name,
        shop.kind,
        shop.address,
        shop.city,
        country,
        shop.lat,
        shop.lng,
        shop.description.it,
        shop.description.en,
        shop.oven,
        shop.image,
        shop.isPublished !== false,
        JSON.stringify(fixture),
      ],
    );
    shopsAdded += result.rowCount;
  }

  for (const story of snapshot.stories) {
    const blocks = story.blocks.map((block) =>
      block.type === 'image' ? { ...block, image: imagePath(block.image) } : block,
    );
    const sourceDate = story.publishedAt
      ? new Date(`${story.publishedAt} UTC`).toISOString()
      : null;
    const result = await client.query(
      `INSERT INTO rtsm_story
        (slug, language, title, summary, category, blocks, cover_image_url, cover_image_alt,
         source_url, source_published_at, approved_at, published_at, frontend_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now(),$11)
       ON CONFLICT (slug, language) DO NOTHING`,
      [
        story.slug,
        story.language,
        story.title,
        story.summary,
        story.category,
        JSON.stringify(blocks),
        imagePath(story.cover.image),
        story.cover.alt,
        story.sourceUrl,
        sourceDate,
        JSON.stringify({
          readMinutes: story.readMinutes,
          cover: story.cover,
          publishedAt: story.publishedAt,
        }),
      ],
    );
    storiesAdded += result.rowCount;
  }

  await client.query('COMMIT');
  console.log(
    `Imported ${shopsAdded}/${restaurants.length} shops and ${storiesAdded}/${snapshot.stories.length} stories. Existing records were preserved.`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
