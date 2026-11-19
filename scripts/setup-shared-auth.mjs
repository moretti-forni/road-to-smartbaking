import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';
const { values } = parseArgs({ options: { apply: { type: 'boolean' } } });
const schema = process.env.RTSM_DB_SCHEMA || 'road_to_smartbaking';
const role = process.env.RTSM_DB_RUNTIME_ROLE;
if (schema !== 'road_to_smartbaking' || !role || !/^[a-z][a-z0-9_]{0,62}$/.test(role))
  throw new Error('Use the dedicated project schema and an explicit runtime role');
const sql = await readFile(
  new URL('../src/server/db/migrations/006-staff-email-auth.sql', import.meta.url),
  'utf8',
);
const content = await readFile(
  new URL('../src/server/db/shared-schema.sql', import.meta.url),
  'utf8',
);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const marker = `rtsm-staff-auth-v1:${digest(sql)}`;
if (!values.apply) {
  console.log(
    `Plan: add two staff authentication tables in ${schema}, grant DML to ${role}. No connection or changes made.`,
  );
  process.exit(0);
}
if (!process.env.RTSM_MIGRATION_DATABASE_URL || !process.env.RTSM_DB_SSL_CA)
  throw new Error('Migration owner connection and verified RDS CA required');
const db = new pg.Client({
  connectionString: process.env.RTSM_MIGRATION_DATABASE_URL,
  ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
});
await db.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout = '5s'");
  await db.query("SET LOCAL statement_timeout = '60s'");
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`rtsm:setup:${schema}`]);
  const existing = (
    await db.query(
      "SELECT obj_description(oid, 'pg_namespace') AS marker FROM pg_namespace WHERE nspname = $1",
      [schema],
    )
  ).rows[0];
  if (existing?.marker !== `rtsm-four-tables-v1:${digest(content)}`)
    throw new Error('Expected existing project content schema fingerprint; no changes applied');
  const runtime = (
    await db.query('SELECT rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1', [
      role,
    ])
  ).rows[0];
  const owner = (await db.query('SELECT current_user AS name')).rows[0].name;
  if (
    !runtime ||
    runtime.rolsuper ||
    runtime.rolcreaterole ||
    runtime.rolcreatedb ||
    owner === role
  )
    throw new Error('Use a separate migration owner and unprivileged runtime role');
  await db.query(`SET LOCAL search_path TO "${schema}"`);
  const tables = (
    await db.query(
      "SELECT c.relname, obj_description(c.oid, 'pg_class') AS marker FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname IN ('rtsm_staff_challenge', 'rtsm_staff_session')",
      [schema],
    )
  ).rows;
  if (tables.length) {
    if (tables.length !== 2 || tables.some((table) => table.marker !== marker))
      throw new Error('Existing auth tables do not match this installation; review manually');
    console.log('Staff authentication tables already installed.');
  } else {
    await db.query(sql);
    for (const table of ['rtsm_staff_challenge', 'rtsm_staff_session']) {
      await db.query(`REVOKE ALL ON "${table}" FROM PUBLIC`);
      await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO "${role}"`);
      await db.query(`COMMENT ON TABLE "${table}" IS '${marker}'`);
    }
    console.log('Added staff authentication tables and scoped runtime grants.');
  }
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
