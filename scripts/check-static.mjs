import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(
  await readFile(new URL('../app/data/stories.snapshot.json', import.meta.url), 'utf8'),
);
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
    if (
      !document.includes(`lang="${locale}"`) ||
      !document.includes('class="article-body"') ||
      !document.includes('<article>')
    ) {
      throw new Error(`Article HTML was not rendered: ${locale}/${story.slug}`);
    }
    checked += 1;
  }
}
console.log(
  `Verified ${checked} pre-rendered article documents contain article HTML, not only serialized route data.`,
);
