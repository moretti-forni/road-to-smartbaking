import pg from 'pg';
import { loadRuntimeSecrets } from '../config/runtime.mjs';
let pool;
export async function database() {
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
