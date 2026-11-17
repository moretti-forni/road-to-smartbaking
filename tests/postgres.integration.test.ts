// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import {
  requestCode,
  verifyCode,
  readSession,
  revokeSession,
} from '../src/server/auth/session.mjs';
const run = promisify(execFile);
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;
suite('real PostgreSQL migrations and staff authentication', () => {
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  let admin: pg.Client;
  let db: pg.Pool;
  let databaseUrl: string;
  beforeAll(async () => {
    admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    databaseUrl = url.href;
    db = new pg.Pool({ connectionString: databaseUrl });
    vi.stubEnv('RTSM_AUTH_SECRET', 'integration-test-secret-with-at-least-32-characters');
    await run(process.execPath, ['scripts/migrate.mjs'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  }, 30000);
  afterAll(async () => {
    await db?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
    vi.unstubAllEnvs();
  });
  it('migrates a fresh schema, is repeatable, and detects modified migration history', async () => {
    expect(
      (await db.query('SELECT count(*)::int AS count FROM rtsm_schema_migration')).rows[0].count,
    ).toBe(6);
    await run(process.execPath, ['scripts/migrate.mjs'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    const original = (
      await db.query('SELECT checksum FROM rtsm_schema_migration WHERE name = $1', [
        '001-initial-schema.sql',
      ])
    ).rows[0].checksum;
    await db.query("UPDATE rtsm_schema_migration SET checksum = 'changed' WHERE name = $1", [
      '001-initial-schema.sql',
    ]);
    await expect(
      run(process.execPath, ['scripts/migrate.mjs'], {
        env: { ...process.env, DATABASE_URL: databaseUrl },
      }),
    ).rejects.toThrow();
    await db.query('UPDATE rtsm_schema_migration SET checksum = $1 WHERE name = $2', [
      original,
      '001-initial-schema.sql',
    ]);
  });
  it('creates a session only after code verification, blocks replay, and revokes logout', async () => {
    let code = '';
    const { challenge } = await requestCode(
      db,
      { email: 'staff@morettiforni.com' },
      async (_email: string, value: string) => {
        code = value;
      },
    );
    const stored = (
      await db.query('SELECT code_hash FROM rtsm_staff_challenge WHERE id = $1', [challenge])
    ).rows[0];
    expect(stored.code_hash).not.toBe(code);
    await expect(
      verifyCode(db, { email: 'other@morettiforni.com', challenge, code }),
    ).rejects.toMatchObject({ status: 401 });
    const session = await verifyCode(db, { email: 'staff@morettiforni.com', challenge, code });
    const request = new Request('http://localhost', {
      headers: { cookie: `rtsm_staff_session=${session.token}` },
    });
    expect(await readSession(db, request)).toEqual({ email: 'staff@morettiforni.com' });
    await expect(
      verifyCode(db, { email: 'staff@morettiforni.com', challenge, code }),
    ).rejects.toMatchObject({ status: 401 });
    await revokeSession(db, request);
    expect(await readSession(db, request)).toBeUndefined();
  });
  it('limits resends and locks a code after five failed attempts', async () => {
    let code = '';
    const email = 'locked@morettiforni.com';
    const { challenge } = await requestCode(
      db,
      { email },
      async (_email: string, value: string) => {
        code = value;
      },
    );
    await expect(requestCode(db, { email }, async () => {})).rejects.toMatchObject({ status: 429 });
    const wrong = code === '000000' ? '111111' : '000000';
    for (let attempt = 0; attempt < 5; attempt++)
      await expect(verifyCode(db, { email, challenge, code: wrong })).rejects.toMatchObject({
        status: 401,
      });
    await expect(verifyCode(db, { email, challenge, code })).rejects.toMatchObject({ status: 401 });
  });
  it('rejects expired codes and consumes codes when email delivery fails', async () => {
    const email = 'expired@morettiforni.com';
    let code = '';
    const { challenge } = await requestCode(
      db,
      { email },
      async (_email: string, value: string) => {
        code = value;
      },
    );
    await db.query(
      "UPDATE rtsm_staff_challenge SET expires_at = now() - interval '1 second' WHERE id = $1",
      [challenge],
    );
    await expect(verifyCode(db, { email, challenge, code })).rejects.toMatchObject({ status: 401 });
    await expect(
      requestCode(db, { email: 'delivery@morettiforni.com' }, async () => {
        throw new Error('SMTP unavailable');
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(
      (
        await db.query('SELECT consumed_at FROM rtsm_staff_challenge WHERE email = $1', [
          'delivery@morettiforni.com',
        ])
      ).rows[0].consumed_at,
    ).not.toBeNull();
  });
});
