import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import { sendStaffCode } from './email.mjs';
export const sessionCookie = 'rtsm_staff_session';
export const staffEmail = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => value.split('@')[1] === 'morettiforni.com',
    'Use your @morettiforni.com email',
  );
const hash = (value) => createHash('sha256').update(value).digest('hex');
function codeHash(id, code) {
  const secret = process.env.RTSM_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('RTSM_AUTH_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
}
export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function requestCode(db, input, deliver = sendStaffCode) {
  if (process.env.RTSM_AUTH_MODE === 'managed')
    throw new AuthError(503, 'Managed staff sign-in is not configured yet.');
  const { email } = z.object({ email: staffEmail }).parse(input);
  const id = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const digest = codeHash(id, code);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(729104813)');
    const {
      rows: [limits],
    } = await client.query(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '10 minutes')::int AS total,
      count(*) FILTER (WHERE email = $1)::int AS hourly,
      count(*) FILTER (WHERE email = $1 AND created_at > now() - interval '60 seconds')::int AS recent
      FROM rtsm_staff_challenge WHERE created_at > now() - interval '1 hour'`,
      [email],
    );
    if (limits.total >= 100 || limits.hourly >= 5 || limits.recent > 0)
      throw new AuthError(429, 'Please wait before requesting another code.');
    await client.query(
      'UPDATE rtsm_staff_challenge SET consumed_at = now() WHERE email = $1 AND consumed_at IS NULL',
      [email],
    );
    await client.query(
      'INSERT INTO rtsm_staff_challenge(id, email, code_hash) VALUES ($1, $2, $3)',
      [id, email, digest],
    );
    await client.query(
      "DELETE FROM rtsm_staff_challenge WHERE created_at < now() - interval '24 hours'",
    );
    await client.query('DELETE FROM rtsm_staff_session WHERE expires_at <= now()');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  try {
    await deliver(email, code);
  } catch {
    await db.query('UPDATE rtsm_staff_challenge SET consumed_at = now() WHERE id = $1', [id]);
    throw new AuthError(503, 'Could not send your code. Please try again later.');
  }
  return { challenge: id };
}
export async function verifyCode(db, input) {
  if (process.env.RTSM_AUTH_MODE === 'managed')
    throw new AuthError(503, 'Managed staff sign-in is not configured yet.');
  const { email, challenge, code } = z
    .object({ email: staffEmail, challenge: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .parse(input);
  const expected = codeHash(challenge, code);
  const client = await db.connect();
  let session;
  try {
    await client.query('BEGIN');
    const {
      rows: [row],
    } = await client.query(
      `SELECT code_hash FROM rtsm_staff_challenge WHERE id = $1 AND email = $2 AND consumed_at IS NULL AND expires_at > now() AND attempts < 5 FOR UPDATE`,
      [challenge, email],
    );
    if (row) {
      await client.query('UPDATE rtsm_staff_challenge SET attempts = attempts + 1 WHERE id = $1', [
        challenge,
      ]);
      if (timingSafeEqual(Buffer.from(row.code_hash, 'hex'), Buffer.from(expected, 'hex'))) {
        await client.query('UPDATE rtsm_staff_challenge SET consumed_at = now() WHERE id = $1', [
          challenge,
        ]);
        session = randomBytes(32).toString('hex');
        await client.query('INSERT INTO rtsm_staff_session(token_hash, email) VALUES ($1, $2)', [
          hash(session),
          email,
        ]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  if (!session) throw new AuthError(401, 'Invalid or expired code.');
  return { token: session, email };
}
export function cookieToken(request) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
export async function readSession(db, request) {
  if (process.env.RTSM_AUTH_MODE === 'managed') return undefined;
  const token = cookieToken(request);
  if (!token) return undefined;
  const {
    rows: [row],
  } = await db.query(
    'SELECT email FROM rtsm_staff_session WHERE token_hash = $1 AND expires_at > now()',
    [hash(token)],
  );
  if (
    process.env.RTSM_AUTH_MODE === 'password' &&
    row &&
    !['noreply-app@morettiforni.com', 'app@morettiforni.com'].includes(row.email)
  )
    return undefined;
  return row;
}
export async function revokeSession(db, request) {
  if (process.env.RTSM_AUTH_MODE === 'managed') return;
  const token = cookieToken(request);
  if (token) await db.query('DELETE FROM rtsm_staff_session WHERE token_hash = $1', [hash(token)]);
}
export function sessionHeader(token) {
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 28800 : 0}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
