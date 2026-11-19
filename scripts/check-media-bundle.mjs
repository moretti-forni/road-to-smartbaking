import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
const forbidden = ['shops', 'shops-webp', 'media', 'ovens', 'mf_factory.jpg'];
for (const root of ['public', '.next/standalone/public'])
  for (const path of forbidden) {
    const file = resolve(root, path);
    try {
      await stat(file);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error(`Catalogue media unexpectedly included in deployment: ${file}`);
  }
try {
  await stat('.next/standalone/assets/catalog');
  throw new Error('Source media archive included in standalone bundle');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
console.log('Media bundle check passed: no catalogue media in public or standalone deployment.');
