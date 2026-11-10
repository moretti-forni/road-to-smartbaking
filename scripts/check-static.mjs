import { readFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const snapshot = JSON.parse(
  await readFile(new URL('../app/data/stories.snapshot.json', import.meta.url), 'utf8'),
);
const live = Boolean(loadEnv('production', process.cwd()).VITE_PUBLIC_API_BASE_URL);
if (live) await readFile(new URL('../build/client/__spa-fallback.html', import.meta.url));

const basePath = process.env.VITE_BASE_PATH?.replace(/^\/+|\/+$/g, '');
const buildPrefix = basePath ? `${basePath}/` : '';

let checked = 0;
for (const locale of ['it', 'en']) {
  for (const story of snapshot.stories) {
    const path = new URL(
      `../build/client/${buildPrefix}${locale}/stories/${story.slug}/index.html`,
      import.meta.url,
    );
    const html = await readFile(path, 'utf8');
    const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const containsArticle =
      document.includes('class="article-body"') && document.includes('<article>');
    if (!document.includes(`lang="${locale}"`) || containsArticle === live) {
      throw new Error(`Unexpected article HTML for this build mode: ${locale}/${story.slug}`);
    }
    checked += 1;
  }
}
console.log(
  `Verified ${checked} article routes contain ${live ? 'live loading shells' : 'pre-rendered article HTML'}.`,
);
