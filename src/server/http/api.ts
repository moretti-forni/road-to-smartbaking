import 'server-only';
import { invokeDataApi, invokeStaffApi } from '../data/client.mjs';
import { isPublicDataRoute } from '../services/public-api.mjs';
import { loadRuntimeSecrets } from '../config/runtime.mjs';
import { MediaError, startUpload, finishUpload } from '../media/uploads.mjs';
import { z, ZodError } from 'zod';
import { ApiError, handleApi } from '../services/api.mjs';
import { isStaff } from '../auth/staff.mjs';
import {
  AuthError,
  cookieToken,
  readSession,
  revokeSession,
  sessionHeader,
} from '../auth/session.mjs';
import { passwordLogin } from '../auth/password.mjs';
import { getDb } from '../db/pool';
const maxBytes = 512 * 1024;
async function readJson(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new ApiError(415, 'Expected application/json');
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new ApiError(413, 'Request body is too large');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new ApiError(413, 'Request body is too large');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid JSON');
  }
}
export async function serveApi(request: Request) {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  let appOrigin = process.env.RTSM_APP_ORIGIN || requestUrl.origin;
  // Next's local server may report 127.0.0.1 when the browser uses localhost.
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.RTSM_APP_ORIGIN &&
    origin &&
    URL.canParse(origin)
  ) {
    const browserUrl = new URL(origin);
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (
      loopback.has(requestUrl.hostname) &&
      loopback.has(browserUrl.hostname) &&
      requestUrl.protocol === browserUrl.protocol &&
      requestUrl.port === browserUrl.port
    )
      appOrigin = browserUrl.origin;
  }
  const allowed = new Set(
    (process.env.RTSM_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  allowed.add(appOrigin);
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (origin && origin !== new URL(request.url).origin && !allowed.has(origin))
    return json({ error: 'Origin not allowed' }, 403);
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  try {
    const path = new URL(request.url).pathname;
    const privileged = path.startsWith('/api/v1/auth/') || path.startsWith('/api/v1/admin/');
    if (privileged && origin && origin !== appOrigin)
      return json({ error: 'Origin not allowed' }, 403);
    if (privileged && !['GET', 'HEAD'].includes(request.method) && origin !== appOrigin)
      return json({ error: 'Origin required' }, 403);
    if (process.env.RTSM_DATA_FUNCTION_ARN && privileged && process.env.RTSM_STAFF_FUNCTION_ARN) {
      const token = cookieToken(request);
      const url = path + new URL(request.url).search;
      if (path.startsWith('/api/v1/admin/media/')) {
        const session = await invokeStaffApi({ method: 'GET', url: '/api/v1/auth/session', token });
        if (session.status !== 200) return json(session.body, session.status);
        const result = await handleApi(
          null,
          {
            method: request.method,
            url,
            staffEmail: z.object({ email: z.email() }).parse(session.body).email,
            authorization: undefined,
            readBody: () => readJson(request),
          },
          undefined,
          { startUpload, finishUpload },
        );
        return json(result.body, result.status ?? 200);
      }
      const result = await invokeStaffApi({
        method: request.method,
        url,
        token,
        body:
          ['POST', 'PUT', 'PATCH'].includes(request.method) && path !== '/api/v1/auth/logout'
            ? await readJson(request)
            : undefined,
      });
      if (path === '/api/v1/auth/login' && request.method === 'POST' && result.status === 200) {
        const verified = z
          .object({ token: z.string().regex(/^[a-f0-9]{64}$/), email: z.email() })
          .safeParse(result.body);
        if (!verified.success) throw new ApiError(503, 'Invalid staff service response');
        headers['Set-Cookie'] = sessionHeader(verified.data.token);
        return json({ email: verified.data.email });
      }
      if (path === '/api/v1/auth/logout' && request.method === 'POST')
        headers['Set-Cookie'] = sessionHeader('');
      return json(result.body, result.status);
    }
    if (process.env.RTSM_DATA_FUNCTION_ARN) {
      if (path.startsWith('/api/v1/admin/'))
        return json({ error: 'Staff authorization required' }, 401);
      if (path.startsWith('/api/v1/auth/')) {
        if (path === '/api/v1/auth/logout' && request.method === 'POST') {
          headers['Set-Cookie'] = sessionHeader('');
          return json({ ok: true });
        }
        if (path === '/api/v1/auth/session') return json({ error: 'Sign in required' }, 401);
        return json({ error: 'Managed staff sign-in is not configured yet.' }, 503);
      }
      if (!isPublicDataRoute(request.method, request.url))
        return json({ error: 'Endpoint not found' }, 404);
      const result = await invokeDataApi({
        method: request.method,
        url: path + new URL(request.url).search,
        body: request.method === 'POST' ? await readJson(request) : undefined,
      });
      return json(result.body, result.status);
    }
    await loadRuntimeSecrets();
    if (path.startsWith('/api/v1/auth/')) {
      const db = getDb();
      if (path === '/api/v1/auth/login' && request.method === 'POST') {
        const session = await passwordLogin(db, await readJson(request));
        headers['Set-Cookie'] = sessionHeader(session.token);
        return json({ email: session.email });
      }
      if (path === '/api/v1/auth/session' && request.method === 'GET') {
        const session = await readSession(db, request);
        return session ? json(session) : json({ error: 'Sign in required' }, 401);
      }
      if (path === '/api/v1/auth/logout' && request.method === 'POST') {
        await revokeSession(db, request);
        headers['Set-Cookie'] = sessionHeader('');
        return json({ ok: true });
      }
      return json({ error: 'Endpoint not found' }, 404);
    }
    let staffEmail: string | undefined;
    if (path.startsWith('/api/v1/admin/')) {
      const legacy = isStaff(request.headers.get('authorization'), process.env.RTSM_STAFF_TOKEN);
      if (!legacy) staffEmail = (await readSession(getDb(), request))?.email;
      if (!legacy && !staffEmail) return json({ error: 'Staff authorization required' }, 401);
    }
    const result = await handleApi(
      getDb(),
      {
        staffEmail: staffEmail ?? '',
        method: request.method,
        url: request.url,
        authorization: request.headers.get('authorization'),
        readBody: () => readJson(request),
      },
      process.env.RTSM_STAFF_TOKEN,
      { startUpload, finishUpload },
    );
    return json(result.body, result.status ?? 200);
  } catch (error) {
    if (error instanceof ApiError || error instanceof AuthError || error instanceof MediaError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: 'Validation failed',
          issues: error.issues.map(({ path, message }) => ({ path, message })),
        },
        400,
      );
    const code = (error as { code?: string }).code;
    if (code === '23505')
      return json({ error: 'A record with that identifier already exists' }, 409);
    console.error('API error', code ?? (error as Error).name);
    const unavailable =
      !process.env.DATABASE_URL || ['ECONNREFUSED', '57P01', '57014'].includes(code ?? '');
    return json(
      { error: unavailable ? 'Database unavailable' : 'Unexpected server error' },
      unavailable ? 503 : 500,
    );
  }
}
