import { cp, mkdir, rm, writeFile, readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const api = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!api || !/^https:\/\//.test(api))
  throw new Error(
    'Set NEXT_PUBLIC_API_BASE_URL to the hosted HTTPS /api/v1 endpoint for the mobile build.',
  );
await rm('mobile', { recursive: true, force: true });
await mkdir('mobile', { recursive: true });
for (const folder of ['data', 'services', 'styles', 'utils'])
  await cp(`src/${folder}`, `mobile/${folder}`, { recursive: true });
await cp('src/components', 'mobile/components', { recursive: true });
await cp('src/screens', 'mobile/routes', { recursive: true });
await cp('src/features', 'mobile/features', { recursive: true });
await cp('src/i18n.ts', 'mobile/i18n.ts');
await cp('mobile-source', 'mobile', { recursive: true });
// Translate the small navigation surface while keeping UI components shared.
async function adapt(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) {
      await adapt(path);
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;
    let source = (await readFile(path, 'utf8')).replace(/^'use client';\s*/, '');
    source = source
      .replace(/import Link from 'next\/link';/g, "import { Link } from 'react-router';")
      .replace(
        /import \{ useParams \} from 'next\/navigation';/g,
        "import { useParams } from 'react-router';",
      )
      .replace(
        /import \{ ([^}]+) \} from '(?:\.\.\/lib\/navigation|\.\/navigation)';/g,
        "import { $1 } from 'react-router';",
      )
      .replace(/\bhref=/g, 'to=')
      .replace(/\.\.\/\.\.\/screens\//g, '../../routes/');
    // Native anchor hrefs must remain hrefs; only Link/NavLink use the router prop.
    source = source.replace(/<(a|img|link)([\s\S]*?)>/g, (match) =>
      match.replace(/\bto=/g, 'href='),
    );
    await writeFile(path, source);
  }
}
await adapt('mobile/components');
await adapt('mobile/routes');
// Vite replaces these public values at compile time; no server credentials enter the bundle.
await writeFile(
  'mobile/services/http.ts',
  `import axios from 'axios';\nexport const usesPublicApi = true;\nexport const publicHttp = axios.create({ baseURL: ${JSON.stringify(api)}, timeout: 12000 });\n`,
);
await writeFile(
  'mobile/utils/public-path.ts',
  `export function publicPath(path: string) { return '/' + path.replace(/^\\//, ''); }\n`,
);
await writeFile(
  'mobile/services/map-tiles.ts',
  (await readFile('src/services/map-tiles.ts', 'utf8')).replace(
    /process\.env\.(NEXT_PUBLIC_\w+)/g,
    (_, key) => JSON.stringify(process.env[key] ?? ''),
  ),
);
const run = spawnSync(resolve('node_modules/.bin/react-router'), ['build'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
process.exitCode = run.status ?? 1;
