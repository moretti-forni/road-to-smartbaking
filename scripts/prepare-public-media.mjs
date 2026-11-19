import { cp, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import nextEnv from '@next/env';
const production = process.argv.includes('--production');
nextEnv.loadEnvConfig(process.cwd(), !production);
const entries = ['shops', 'shops-webp', 'media', 'ovens', 'mf_factory.jpg'];
const source = resolve('assets/catalog');
const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
if (production && !base)
  throw new Error(
    'Production builds require NEXT_PUBLIC_MEDIA_BASE_URL; catalogue media must be served from S3/CloudFront.',
  );
if (base) {
  const url = new URL(base);
  if (
    url.protocol !== 'https:' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.pathname !== '/'
  )
    throw new Error('NEXT_PUBLIC_MEDIA_BASE_URL must be an HTTPS origin.');
}
for (const entry of entries) {
  const path = resolve('public', entry);
  await rm(path, { recursive: true, force: true });
  if (!base) {
    await stat(resolve(source, entry));
    await cp(resolve(source, entry), path, { recursive: true });
  }
}
console.log(
  base
    ? 'Catalogue media excluded from public assets; CDN delivery enabled.'
    : 'Prepared ignored local catalogue copies for development.',
);
