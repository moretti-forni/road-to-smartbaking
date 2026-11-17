import { parseArgs } from 'node:util';
import pg from 'pg';
import { loadRuntimeSecrets } from '../src/server/config/runtime.mjs';
import { prepareCatalog, summary, verifyCatalog, catalogCounts } from './lib/catalog-import.mjs';
import { getStory, getShop, listStories, listShops } from '../src/server/repositories/catalog.mjs';
const { values } = parseArgs({
  options: {
    'expected-database': { type: 'string' },
    schema: { type: 'string', default: 'road_to_smartbaking' },
  },
});
if (!values['expected-database'] || !/^[a-z][a-z0-9_]{0,62}$/.test(values.schema))
  throw new Error('Specify --expected-database and a valid schema');
const plan = await prepareCatalog();
await loadRuntimeSecrets();
if (!process.env.DATABASE_URL) throw new Error('Database configuration required');
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.RTSM_DB_SSL_CA
    ? { ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true } }
    : {}),
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
  application_name: 'rtsm-catalog-verification',
});
await db.connect();
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const actual = (await db.query('SELECT current_database() AS name')).rows[0].name;
  if (actual !== values['expected-database']) throw new Error('Unexpected database');
  await db.query(`SET LOCAL search_path TO "${values.schema}"`);
  const verification = await verifyCatalog(db, values.schema, plan);
  const publicShops = await listShops(db, { limit: 100, offset: 0 });
  const italian = await listStories(db, { language: 'it', limit: 100, offset: 0 });
  const english = await listStories(db, { language: 'en', limit: 100, offset: 0 });
  for (const shop of plan.shops.filter((shop) => !shop.published)) {
    if (await getShop(db, shop.id)) throw new Error('Hidden source shop is public');
  }
  const key = plan.stories[0].slug;
  // Same translation fallback used by the server and browser catalog services.
  const fallback =
    (await getStory(db, { slug: key, language: 'en' })) ??
    (await getStory(db, { slug: key, language: 'it' }));
  const report = {
    database: actual,
    schema: values.schema,
    counts: await catalogCounts(db, values.schema),
    source: summary(plan),
    verification,
    publicApi: {
      shops: publicShops.length,
      italianStories: italian.length,
      englishStories: english.length,
      englishFallbackLanguage: fallback?.language,
      hiddenShopExcluded: true,
    },
  };
  if (verification.differences.shops.length || verification.differences.stories.length)
    throw new Error(
      'Database content differs from the source; inspect staff edits before rerunning any import',
    );
  if (!fallback?.blocks.length || fallback.language !== 'it' || english.length !== 0)
    throw new Error('Unexpected story language fallback');
  await db.query('ROLLBACK');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await db.end();
}
