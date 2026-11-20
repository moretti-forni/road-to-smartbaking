import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { readFile, writeFile } from 'node:fs/promises';
import { hashPassword, staffAccounts } from '../src/server/auth/password.mjs';
if (!process.stdin.isTTY)
  throw new Error('Run interactively in your terminal; do not pass passwords on the command line.');
const output = new Writable({
  write(_chunk, _encoding, done) {
    done();
  },
});
const terminal = createInterface({ input: process.stdin, output, terminal: true });
const hashes = {};
try {
  for (const email of staffAccounts) {
    process.stdout.write(`Password for ${email} (12–128 characters, input hidden): `);
    const password = await terminal.question('');
    process.stdout.write('\nConfirm password (input hidden): ');
    const confirmation = await terminal.question('');
    process.stdout.write('\n');
    if (password !== confirmation) throw new Error('Passwords do not match');
    hashes[email] = await hashPassword(password);
  }
  await writeFile(
    '.staff-passwords.json',
    JSON.stringify({ RTSM_STAFF_PASSWORD_HASHES: JSON.stringify(hashes) }, null, 2) + '\n',
    { mode: 0o600, flag: 'wx' },
  );
  if (process.argv.includes('--local')) {
    const path = '.env.local';
    const existing = await readFile(path, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    const retained = existing
      .split('\n')
      .filter((line) => !/^(RTSM_AUTH_MODE|RTSM_STAFF_PASSWORD_HASHES)=/.test(line));
    // Next expands $ in dotenv files; preserve scrypt's literal separators.
    const encoded = JSON.stringify(hashes).replaceAll('$', '\\$');
    await writeFile(
      path,
      retained.join('\n') + `\nRTSM_AUTH_MODE=password\nRTSM_STAFF_PASSWORD_HASHES='${encoded}'\n`,
      { mode: 0o600 },
    );
    console.log('Configured .env.local for password login. Restart the local server.');
  }
  console.log(
    'Saved password hashes to .staff-passwords.json (ignored by Git). Merge its field into the existing project runtime secret, preserving the database fields. No plaintext passwords were saved.',
  );
} finally {
  terminal.close();
}
