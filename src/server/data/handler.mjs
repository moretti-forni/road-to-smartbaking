import pg from 'pg';
import { z, ZodError } from 'zod';
import { loadRuntimeSecrets } from '../config/runtime.mjs';
import { handlePublicApi, isPublicDataRoute } from '../services/public-api.mjs';
import { ApiError } from '../services/errors.mjs';
const envelope = z
  .object({
    method: z.enum(['GET', 'POST']),
    url: z
      .string()
      .max(4096)
      .regex(/^\/api\/v1\//),
    body: z.unknown().optional(),
  })
  .strict();
let pool;
async function database() {
  await loadRuntimeSecrets();
  if (!pool) {
    if (
      !process.env.DATABASE_URL ||
      !process.env.RTSM_DB_SSL_CA ||
      process.env.RTSM_DB_SCHEMA !== 'road_to_smartbaking'
    )
      throw new Error('Database configuration unavailable');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true },
      options: '-c search_path=road_to_smartbaking',
      max: 1,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      idleTimeoutMillis: 10000,
      application_name: 'rtsm-private-data-function',
    });
    pool.on('error', (error) => console.error('Database pool error', error.code ?? error.name));
  }
  return pool;
}
// No Function URL or API Gateway: only IAM-authorized Lambda Invoke callers can reach this handler.
export async function handler(event, context) {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  try {
    if (Buffer.byteLength(JSON.stringify(event)) > 512 * 1024)
      throw new ApiError(413, 'Request body is too large');
    const input = envelope.parse(event);
    if (!isPublicDataRoute(input.method, input.url))
      throw new ApiError(403, 'Endpoint not allowed');
    const result = await handlePublicApi(await database(), {
      ...input,
      readBody: async () => input.body,
    });
    return { status: result.status ?? 200, body: result.body };
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: { error: error.message } };
    if (error instanceof ZodError)
      return {
        status: 400,
        body: {
          error: 'Validation failed',
          issues: error.issues.map(({ path, message }) => ({ path, message })),
        },
      };
    if (error.code === '23505')
      return { status: 409, body: { error: 'A record with that identifier already exists' } };
    console.error('Data function error', error.code ?? error.name);
    return { status: 503, body: { error: 'Database unavailable' } };
  }
}
