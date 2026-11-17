import { spawnSync } from 'node:child_process';
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL)
  throw new Error('Set TEST_DATABASE_URL or a dedicated local DATABASE_URL');
const result = spawnSync(
  'node_modules/.bin/vitest',
  ['run', 'tests/postgres.integration.test.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
);
process.exitCode = result.status ?? 1;
