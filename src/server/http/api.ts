import 'server-only';
import { ZodError } from 'zod';
import { ApiError, handleApi } from '../services/api.mjs';
import { isStaff } from '../auth/staff.mjs';
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
  const allowed = new Set(
    (process.env.RTSM_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
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
  if (
    new URL(request.url).pathname.startsWith('/api/v1/admin/') &&
    !isStaff(request.headers.get('authorization'), process.env.RTSM_STAFF_TOKEN)
  )
    return json({ error: 'Staff authorization required' }, 401);
  try {
    const result = await handleApi(
      getDb(),
      {
        method: request.method,
        url: request.url,
        authorization: request.headers.get('authorization'),
        readBody: () => readJson(request),
      },
      process.env.RTSM_STAFF_TOKEN,
    );
    return json(result.body, result.status ?? 200);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
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
