import 'server-only';
import { Pool } from 'pg';
const globalDb = globalThis as typeof globalThis & { rtsmPool?: Pool };
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required; configure the dedicated project database.');
  if (!globalDb.rtsmPool) {
    globalDb.rtsmPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 3000,
      statement_timeout: 10000,
    });
    globalDb.rtsmPool.on('error', (error) => console.error('PostgreSQL pool error', error.name));
  }
  return globalDb.rtsmPool;
}
