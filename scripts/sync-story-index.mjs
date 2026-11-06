import { readFile, writeFile } from 'node:fs/promises';

const snapshotPath = new URL('../app/data/stories.snapshot.json', import.meta.url);
const indexPath = new URL('../app/data/story-index.json', import.meta.url);
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
const index = snapshot.stories.map((story) => {
  const { blocks, ...summary } = story;
  if (!Array.isArray(blocks)) throw new Error(`Missing article blocks: ${story.slug}`);
  return summary;
});
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Indexed ${index.length} stories without bundling full articles into listing pages.`);
