import {
  randomBytes,
  randomUUID,
  scrypt as derive,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { AuthError } from './session.mjs';
const scrypt = promisify(derive);
export const staffAccounts = ['noreply-app@morettiforni.com', 'app@morettiforni.com'];
const digestPattern = /^scrypt\$32768\$[a-f0-9]{32}\$[a-f0-9]{128}$/;
function passwordHashes() {
  try {
    const values = JSON.parse(process.env.RTSM_STAFF_PASSWORD_HASHES || '{}');
    for (const email of staffAccounts)
      if (!digestPattern.test(values[email] || '')) throw new Error('Missing hash');
    return values;
  } catch {
    throw new AuthError(503, 'Staff passwords are not configured.');
  }
}
export async function hashPassword(password) {
  z.string().min(12).max(128).parse(password);
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$${salt}$${key.toString('hex')}`;
}
export async function checkPassword(password, digest) {
  if (!digestPattern.test(digest)) throw new Error('Invalid staff password configuration');
  const [, , salt, expected] = digest.split('$');
  const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(key, Buffer.from(expected, 'hex'));
}
export async function passwordLogin(db, input) {
  if (process.env.RTSM_AUTH_MODE !== 'password')
    throw new AuthError(503, 'Staff sign-in is not configured');
  const { email, password } = z
    .object({
      email: z
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict()
    .parse(input);
  const hashes = passwordHashes();
  const allowed = staffAccounts.includes(email);
  const key = allowed ? email : 'unknown@morettiforni.com';
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(729104814)');
    const {
      rows: [limits],
    } = await client.query(
      `SELECT count(*)::int AS total,
      count(*) FILTER (WHERE email = $1)::int AS account FROM rtsm_staff_challenge
      WHERE code_hash = 'password-login' AND created_at > now() - interval '15 minutes'`,
      [key],
    );
    if (limits.total >= 50 || limits.account >= 10)
      throw new AuthError(429, 'Too many attempts. Try again in 15 minutes.');
    await client.query(
      "INSERT INTO rtsm_staff_challenge(id,email,code_hash,consumed_at) VALUES ($1,$2,'password-login',now())",
      [randomUUID(), key],
    );
    await client.query(
      "DELETE FROM rtsm_staff_challenge WHERE created_at < now() - interval '24 hours'",
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  // Unknown addresses perform the same expensive verification but cannot authenticate.
  const valid = await checkPassword(password, hashes[allowed ? email : staffAccounts[0]]);
  if (!valid || !allowed) throw new AuthError(401, 'Invalid email or password.');
  const token = randomBytes(32).toString('hex');
  await db.query('INSERT INTO rtsm_staff_session(token_hash,email) VALUES ($1,$2)', [
    createHash('sha256').update(token).digest('hex'),
    email,
  ]);
  await db.query('DELETE FROM rtsm_staff_session WHERE expires_at <= now()');
  return { token, email };
}
