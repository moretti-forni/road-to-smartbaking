import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await mkdir('build/staff-function', { recursive: true });
await build({
  entryPoints: ['src/server/staff/handler.mjs'],
  outfile: 'build/staff-function/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
});
execFileSync('zip', ['-j', '-q', '../staff-function.zip', 'index.js'], {
  cwd: 'build/staff-function',
});
console.log('Built build/staff-function.zip');
