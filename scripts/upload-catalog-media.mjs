import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
const { values } = parseArgs({ options: { apply: { type: 'boolean' } } });
const root = resolve('assets/catalog');
const files = [];
async function collect(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isDirectory()) await collect(resolve(path, entry.name));
    else if (entry.isFile() && /\.(?:jpe?g|png|webp|avif|svg)$/i.test(entry.name))
      files.push(resolve(path, entry.name));
  }
}
for (const dir of ['shops', 'shops-webp', 'media', 'ovens']) await collect(resolve(root, dir));
files.push(resolve(root, 'mf_factory.jpg'));
files.sort();
const plan = await Promise.all(
  files.map(async (file) => {
    const body = await readFile(file);
    return {
      file,
      key: `media/catalog/${relative(root, file).split('\\').join('/')}`,
      bytes: body.length,
      hash: createHash('sha256').update(body).digest('hex'),
    };
  }),
);
console.log(
  JSON.stringify({
    files: plan.length,
    bytes: plan.reduce((total, file) => total + file.bytes, 0),
    bucket: process.env.S3_MEDIA_BUCKET || '(not configured)',
    mode: values.apply ? 'upload' : 'dry-run',
  }),
);
if (!values.apply) process.exit(0);
if (!process.env.S3_MEDIA_BUCKET) throw new Error('S3_MEDIA_BUCKET is required');
const client = new S3Client({ region: process.env.RTSM_AWS_REGION || 'eu-west-1' });
const mime = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};
let uploaded = 0;
let skipped = 0;
try {
  for (const file of plan) {
    try {
      const existing = await client.send(
        new HeadObjectCommand({ Bucket: process.env.S3_MEDIA_BUCKET, Key: file.key }),
      );
      if (existing.Metadata?.sha256 !== file.hash || existing.ContentLength !== file.bytes)
        throw new Error(`Existing object differs; refusing to overwrite ${file.key}`);
      skipped++;
      continue;
    } catch (error) {
      if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) throw error;
    }
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_MEDIA_BUCKET,
        Key: file.key,
        Body: await readFile(file.file),
        ContentType: mime[file.file.split('.').at(-1).toLowerCase()],
        CacheControl: 'public, max-age=86400',
        Metadata: { sha256: file.hash },
        IfNoneMatch: '*',
      }),
    );
    const check = await client.send(
      new HeadObjectCommand({ Bucket: process.env.S3_MEDIA_BUCKET, Key: file.key }),
    );
    if (check.Metadata?.sha256 !== file.hash || check.ContentLength !== file.bytes)
      throw new Error(`Verification failed: ${file.key}`);
    uploaded++;
  }
} finally {
  client.destroy();
}
console.log(JSON.stringify({ verified: plan.length, uploaded, skipped }));
