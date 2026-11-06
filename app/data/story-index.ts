import index from './story-index.json';
import type { Story } from './content';

export type StorySummary = Omit<Story, 'blocks'>;
export const storyIndex: StorySummary[] = index;
const pngImages = new Set(['002354c11f191a0842fb', 'a85251b591c250949646', 'ede43c75fe60ba6276c8']);
export function imageUrl(image: string) {
  return `/media/${image}.${pngImages.has(image) ? 'png' : 'jpg'}`;
}
export function storyCategory(story: Pick<StorySummary, 'title'>): 'pizza' | 'bakery' | 'people' {
  if (/panific|pasticcer|lievitat|brunelli|fusto|bedin/i.test(story.title)) return 'bakery';
  if (/pizza|pizzeria|neapolis/i.test(story.title)) return 'pizza';
  return 'people';
}
export function formatDate(date: string | null, locale: string) {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf())
    ? date
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        parsed,
      );
}
