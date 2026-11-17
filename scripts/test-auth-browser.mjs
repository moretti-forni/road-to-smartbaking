import { spawnSync } from 'node:child_process';
const database = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!database) throw new Error('Set an isolated test/development database URL');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(database).hostname))
  throw new Error('Browser auth tests require a local database and local Mailpit');
const env = { ...process.env, DATABASE_URL: database };
for (const [command, args] of [
  [process.execPath, ['scripts/migrate.mjs']],
  ['node_modules/.bin/playwright', ['test', '--config=playwright.auth.config.ts']],
]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
