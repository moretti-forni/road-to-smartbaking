import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const clientDirectory = 'build/client';
const outputDirectory = 'build/pages';
const basePath = process.env.VITE_BASE_PATH?.replace(/^\/+|\/+$/g, '');

if (!basePath) {
  throw new Error('VITE_BASE_PATH is required to prepare a GitHub Pages artifact.');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(clientDirectory)) {
  if (entry !== basePath) {
    await cp(join(clientDirectory, entry), join(outputDirectory, entry), { recursive: true });
  }
}

await cp(join(clientDirectory, basePath), outputDirectory, { recursive: true });
