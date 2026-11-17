import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import pg from 'pg';
import { loadRuntimeSecrets } from '../src/server/config/runtime.mjs';
import { prepareCatalog, summary, importCatalog } from './lib/catalog-import.mjs';
const { values } = parseArgs({
  options: {
    apply: { type: 'boolean' },
    schema: { type: 'string', default: 'road_to_smartbaking' },
    'expected-database': { type: 'string' },
    report: { type: 'string' },
  },
});
const plan = await prepareCatalog();
console.log(
  JSON.stringify(
    { mode: values.apply ? 'apply' : 'plan', schema: values.schema, ...summary(plan) },
    null,
    2,
  ),
);
if (!values.apply) {
  console.log(
    'Plan only: no database connection or changes. Pass --apply and --expected-database for an insert-only import.',
  );
} else {
  if (!values['expected-database']) throw new Error('--expected-database is required');
  await loadRuntimeSecrets();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL or a runtime secret is required');
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.RTSM_DB_SSL_CA
      ? { ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true } }
      : {}),
    application_name: 'rtsm-controlled-catalog-import',
    connectionTimeoutMillis: 10000,
  });
  await db.connect();
  try {
    const result = await importCatalog(db, values.schema, plan, {
      expectedDatabase: values['expected-database'],
    });
    const report = {
      importedAt: new Date().toISOString(),
      database: values['expected-database'],
      schema: values.schema,
      source: summary(plan),
      ...result,
    };
    if (values.report)
      await writeFile(values.report, JSON.stringify(report, null, 2) + '\n', {
        mode: 0o600,
        flag: 'wx',
      });
    console.log(
      JSON.stringify(
        {
          ...report,
          inserted: {
            shops: result.inserted.shops.length,
            stories: result.inserted.stories.length,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await db.end();
  }
}
