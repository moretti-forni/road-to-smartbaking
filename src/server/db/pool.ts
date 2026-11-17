import 'server-only';
import { Pool } from 'pg';
const globalDb = globalThis as typeof globalThis & { rtsmPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required; configure the project database connection.');
  const schema = process.env.RTSM_DB_SCHEMA;
  if (schema && !/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid RTSM_DB_SCHEMA');
  if (!globalDb.rtsmPool) {
    globalDb.rtsmPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ...(process.env.RTSM_DB_SSL_CA
        ? { ssl: { ca: process.env.RTSM_DB_SSL_CA, rejectUnauthorized: true } }
        : {}),
      max: 5,
      application_name: 'road-to-smartbaking',
      ...(schema ? { options: `-c search_path=${schema}` } : {}),
      connectionTimeoutMillis: 3000,
      statement_timeout: 10000,
    });
    globalDb.rtsmPool.on('error', (error) => console.error('PostgreSQL pool error', error.name));
  }
  return globalDb.rtsmPool;
}
