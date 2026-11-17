import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';
const { values } = parseArgs({
  options: { status: { type: 'boolean' }, 'baseline-through': { type: 'string' } },
});
if (process.env.RTSM_DB_SCHEMA)
  throw new Error(
    'Shared schemas use db:setup:shared and reviewed schema-scoped upgrades, not the legacy migration chain.',
  );
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const directory = new URL('../src/server/db/migrations/', import.meta.url);
const names = (await readdir(directory)).filter((name) => /^\d{3}-.+\.sql$/.test(name)).sort();
if (values['baseline-through'] && !names.includes(values['baseline-through']))
  throw new Error('Unknown baseline migration');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});
await client.connect();
try {
  await client.query('SELECT pg_advisory_lock(729104812)');
  await client.query(
    `CREATE TABLE IF NOT EXISTS rtsm_schema_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now(), baselined boolean NOT NULL DEFAULT false)`,
  );
  if (values['baseline-through']) {
    if (values['baseline-through'] !== '005-venue-reports.sql')
      throw new Error('Only the documented legacy 001–005 baseline is supported');
    const {
      rows: [existing],
    } = await client.query(
      `SELECT to_regclass('rtsm_shop') IS NOT NULL AND to_regclass('rtsm_story') IS NOT NULL AND to_regclass('rtsm_requests') IS NOT NULL AND to_regclass('rtsm_content_draft') IS NOT NULL AND to_regclass('rtsm_reports') IS NOT NULL AS ready`,
    );
    if (!existing.ready)
      throw new Error(
        'Legacy baseline requires all five existing migrations. Use db:migrate without baseline for an empty database.',
      );
    const { rows: constraints } = await client.query(
      `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN (to_regclass('rtsm_shop'), to_regclass('rtsm_requests')) AND conname IN ('rtsm_shop_category_check', 'rtsm_requests_category_check')`,
    );
    if (
      constraints.length !== 2 ||
      constraints.some(
        (row) => !row.definition.includes('restaurant') || !row.definition.includes('qsr'),
      )
    )
      throw new Error('Category migration 004 has not been applied');
  }
  const applied = new Map(
    (await client.query('SELECT name, checksum FROM rtsm_schema_migration')).rows.map((row) => [
      row.name,
      row.checksum,
    ]),
  );
  for (const name of applied.keys())
    if (!names.includes(name)) throw new Error(`Missing applied migration: ${name}`);
  for (const name of names) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Applied migration changed: ${name}`);
      console.log(`Applied ${name}`);
      continue;
    }
    if (values.status) {
      console.log(`Pending ${name}`);
      continue;
    }
    const baseline = Boolean(values['baseline-through'] && name <= values['baseline-through']);
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout = '10s'");
      await client.query("SET LOCAL statement_timeout = '120s'");
      if (!baseline)
        await client.query(sql.replace(/^\s*BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));
      await client.query(
        'INSERT INTO rtsm_schema_migration(name, checksum, baselined) VALUES ($1, $2, $3)',
        [name, checksum, baseline],
      );
      await client.query('COMMIT');
      console.log(`${baseline ? 'Baselined' : 'Applied'} ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
