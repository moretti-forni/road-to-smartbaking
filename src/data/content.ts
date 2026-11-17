import { z } from 'zod';
import snapshot from './stories.snapshot.json';

const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({
    type: z.literal('image'),
    image: z.string(),
    sourceUrl: z.string().url(),
    alt: z.string(),
    aspectRatio: z.number(),
  }),
]);
const storySchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  language: z.string(),
  publishedAt: z.string().nullable(),
  sourceUrl: z.string().url(),
  readMinutes: z.number(),
  cover: z.object({ image: z.string(), alt: z.string(), aspectRatio: z.number() }),
  blocks: z.array(blockSchema),
});

export type Story = z.infer<typeof storySchema>;
export const stories = z.array(storySchema).parse(snapshot.stories);
export { imageUrl, storyCategory, formatDate } from './story-index';
