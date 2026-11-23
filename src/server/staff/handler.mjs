import { z, ZodError } from 'zod';
import { passwordLogin } from '../auth/password.mjs';
import { database } from '../data/database.mjs';
import { ApiError, handleApi } from '../services/api.mjs';
import { AuthError, readSession, revokeSession, sessionCookie } from '../auth/session.mjs';
const envelope = z
  .object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH']),
    url: z
      .string()
      .max(4096)
      .regex(/^\/api\/v1\/(auth|admin)\//),
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    body: z.unknown().optional(),
  })
  .strict();
// IAM Invoke only. The caller supplies a session token, never a trusted staff identity.
export async function handler(event, context) {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    if (Buffer.byteLength(JSON.stringify(event)) > 512 * 1024)
      throw new ApiError(413, 'Request body is too large');
    const input = envelope.parse(event);
    const path = new URL(input.url, 'https://internal.invalid').pathname;
    if (process.env.RTSM_AUTH_MODE !== 'password')
      throw new AuthError(503, 'Staff sign-in is not configured');
    // Media stays on Amplify compute; this function only authorizes its session.
    if (path.startsWith('/api/v1/admin/media/')) throw new ApiError(403, 'Endpoint not allowed');
    const db = await database();
    const request = new Request('https://internal.invalid', {
      headers: input.token ? { cookie: `${sessionCookie}=${input.token}` } : {},
    });
    const route = `${input.method} ${path}`;
    if (route === 'POST /api/v1/auth/login')
      return { status: 200, body: await passwordLogin(db, input.body) };
    if (route === 'POST /api/v1/auth/logout') {
      await revokeSession(db, request);
      return { status: 200, body: { ok: true } };
    }
    const session = await readSession(db, request);
    if (!session) throw new AuthError(401, 'Sign in required');
    if (route === 'GET /api/v1/auth/session') return { status: 200, body: session };
    if (!path.startsWith('/api/v1/admin/')) throw new ApiError(404, 'Endpoint not found');
    const result = await handleApi(db, {
      ...input,
      staffEmail: session.email,
      readBody: async () => input.body,
    });
    return { status: result.status ?? 200, body: result.body };
  } catch (error) {
    if (error instanceof ApiError || error instanceof AuthError)
      return { status: error.status, body: { error: error.message } };
    if (error instanceof ZodError) return { status: 400, body: { error: 'Validation failed' } };
    if (error.code === '23505')
      return { status: 409, body: { error: 'A record with that identifier already exists' } };
    console.error('Staff function error', error.code ?? error.name);
    return { status: 503, body: { error: 'Staff service unavailable' } };
  }
}
