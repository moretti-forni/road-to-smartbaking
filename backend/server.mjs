import { createServer } from 'node:http';
import pg from 'pg';
import { ZodError } from 'zod';
import { ApiError, handleApi } from './api.mjs';

const { DATABASE_URL, RTSM_STAFF_TOKEN, RTSM_API_PORT = '3001' } = process.env;
const origins = new Set(
  (process.env.RTSM_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim()),
);

const db = new pg.Pool({
  connectionString: DATABASE_URL ?? 'postgresql://rtsm:rtsm_local_only@127.0.0.1:5433/rtsm',
  connectionTimeoutMillis: 3000,
  statement_timeout: 10000,
});
db.on('error', (error) => console.error('PostgreSQL pool error', error.code ?? error.name));

const maxBodyBytes = 512 * 1024;

async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw new ApiError(415, 'Expected application/json');
  }
  if (Number(request.headers['content-length']) > maxBodyBytes) {
    throw new ApiError(413, 'Request body is too large');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) throw new ApiError(413, 'Request body is too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid JSON');
  }
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const { origin, authorization } = request.headers;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Origin');
  if (origin && !origins.has(origin)) {
    send(response, 403, { error: 'Origin not allowed' });
    return;
  }
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  if (request.method === 'OPTIONS') {
    response
      .writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
      .end();
    return;
  }

  try {
    const result = await handleApi(
      db,
      {
        method: request.method,
        url: request.url,
        authorization,
        readBody: () => readJson(request),
      },
      RTSM_STAFF_TOKEN,
    );
    send(response, result.status ?? 200, result.body);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 413) response.setHeader('Connection', 'close');
      send(response, error.status, { error: error.message });
    } else if (error instanceof ZodError) {
      send(response, 400, {
        error: 'Validation failed',
        issues: error.issues.map(({ path, message }) => ({ path, message })),
      });
    } else if (error.code === '23505') {
      send(response, 409, { error: 'A record with that identifier already exists' });
    } else {
      console.error('API error', error.code ?? error.name);
      const unavailable = ['ECONNREFUSED', '57P01', '57014'].includes(error.code);
      send(response, unavailable ? 503 : 500, {
        error: unavailable ? 'Database unavailable' : 'Unexpected server error',
      });
    }
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${RTSM_API_PORT} is already in use. Check http://127.0.0.1:${RTSM_API_PORT}/api/v1/health or set RTSM_API_PORT to a free port.`,
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
  void db.end();
});

server.listen(Number(RTSM_API_PORT), '127.0.0.1', () => {
  console.log(`RoadToSmartBaking API at http://127.0.0.1:${RTSM_API_PORT}/api/v1`);
  if (!RTSM_STAFF_TOKEN) console.log('Set RTSM_STAFF_TOKEN to enable staff endpoints.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () =>
    server.close(() => {
      void db.end();
    }),
  );
}
