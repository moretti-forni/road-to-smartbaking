import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await mkdir('build/data-function', { recursive: true });
await build({
  entryPoints: ['src/server/data/handler.mjs'],
  outfile: 'build/data-function/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
});
execFileSync('zip', ['-j', '-q', '../data-function.zip', 'index.js'], {
  cwd: 'build/data-function',
});
console.log('Built build/data-function.zip');
