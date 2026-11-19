// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const script = resolve('scripts/prepare-public-media.mjs');
const folders: string[] = [];
afterEach(async () => {
  for (const path of folders.splice(0)) await rm(path, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'rtsm-media-package-'));
  folders.push(root);
  for (const name of ['shops', 'shops-webp', 'media', 'ovens']) {
    await mkdir(resolve(root, 'assets/catalog', name), { recursive: true });
    await writeFile(resolve(root, 'assets/catalog', name, 'image.txt'), 'source');
  }
  await writeFile(resolve(root, 'assets/catalog/mf_factory.jpg'), 'source');
  await mkdir(resolve(root, 'public'), { recursive: true });
  await writeFile(resolve(root, 'public/icon.svg'), 'essential');
  return root;
}
describe('media packaging', () => {
  it('keeps source archives and essentials but removes catalogue copies for production', async () => {
    const root = await fixture();
    await run(process.execPath, [script], {
      cwd: root,
      env: { ...process.env, NEXT_PUBLIC_MEDIA_BASE_URL: '' },
    });
    expect(await readFile(resolve(root, 'public/media/image.txt'), 'utf8')).toBe('source');
    await run(process.execPath, [script, '--production'], {
      cwd: root,
      env: { ...process.env, NEXT_PUBLIC_MEDIA_BASE_URL: 'https://cdn.example.com' },
    });
    await expect(stat(resolve(root, 'public/media'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(resolve(root, 'public/icon.svg'), 'utf8')).toBe('essential');
    expect(await readFile(resolve(root, 'assets/catalog/media/image.txt'), 'utf8')).toBe('source');
  });
  it('refuses production packaging without a CDN origin or with insecure configuration', async () => {
    const root = await fixture();
    for (const value of ['', 'http://cdn.example.com', 'https://cdn.example.com/private'])
      await expect(
        run(process.execPath, [script, '--production'], {
          cwd: root,
          env: { ...process.env, NEXT_PUBLIC_MEDIA_BASE_URL: value },
        }),
      ).rejects.toThrow();
    expect(await readFile(resolve(root, 'public/icon.svg'), 'utf8')).toBe('essential');
  });
});
