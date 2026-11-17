import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';
const { values } = parseArgs({ options: { apply: { type: 'boolean' } } });
const schema = process.env.RTSM_DB_SCHEMA || 'road_to_smartbaking';
const role = process.env.RTSM_DB_RUNTIME_ROLE;
const identifier = /^[a-z][a-z0-9_]{0,62}$/;
if (
  !identifier.test(schema) ||
  ['public', 'information_schema'].includes(schema) ||
  schema.startsWith('pg_')
)
  throw new Error('Use a dedicated RTSM_DB_SCHEMA');
if (!role || !identifier.test(role)) throw new Error('RTSM_DB_RUNTIME_ROLE is required');
const sql = await readFile(new URL('../src/server/db/shared-schema.sql', import.meta.url), 'utf8');
const fingerprint = `rtsm-four-tables-v1:${createHash('sha256').update(sql).digest('hex')}`;
if (!values.apply) {
  console.log(
    `Plan: create schema ${schema} with four content tables; grant runtime DML to existing role ${role}.`,
  );
  console.log(
    'No connection or database changes made. Use --apply with RTSM_MIGRATION_DATABASE_URL from a trusted migration runner.',
  );
  process.exit(0);
}
if (!process.env.RTSM_MIGRATION_DATABASE_URL)
  throw new Error(
    'RTSM_MIGRATION_DATABASE_URL is required; do not reuse runtime owner credentials',
  );
const db = new pg.Client({
  connectionString: process.env.RTSM_MIGRATION_DATABASE_URL,
  ...(process.env.RTSM_DB_SSL_CA
    ? { ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true } }
    : {}),
  connectionTimeoutMillis: 10000,
});
await db.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`rtsm:setup:${schema}`]);
  const runtime = (
    await db.query(
      'SELECT rolsuper, rolcreaterole, rolcreatedb, rolinherit FROM pg_roles WHERE rolname = $1',
      [role],
    )
  ).rows[0];
  if (!runtime || runtime.rolsuper || runtime.rolcreaterole || runtime.rolcreatedb)
    throw new Error('Provision a dedicated unprivileged runtime role first');
  const owner = (await db.query('SELECT current_user AS name')).rows[0].name;
  if (owner === role) throw new Error('Migration owner must differ from runtime role');
  const existing = (
    await db.query(
      "SELECT obj_description(oid, 'pg_namespace') AS marker FROM pg_namespace WHERE nspname = $1",
      [schema],
    )
  ).rows[0];
  if (existing) {
    if (existing.marker !== fingerprint)
      throw new Error(
        'Schema already exists without this exact installation fingerprint; no changes applied. Review migration path.',
      );
    console.log('Four-table schema already installed; no changes applied.');
  } else {
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(`REVOKE ALL ON SCHEMA "${schema}" FROM PUBLIC`);
    await db.query(`SET LOCAL search_path TO "${schema}"`);
    await db.query(sql);
    await db.query(`REVOKE ALL ON ALL TABLES IN SCHEMA "${schema}" FROM PUBLIC`);
    await db.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await db.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${schema}" TO "${role}"`,
    );
    await db.query(`COMMENT ON SCHEMA "${schema}" IS '${fingerprint}'`);
    console.log(
      'Created four content tables and scoped grants. Existing application tables were not altered.',
    );
  }
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
