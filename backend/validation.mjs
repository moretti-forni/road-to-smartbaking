import { z } from 'zod';

const text = (length) => z.string().trim().min(1).max(length);
const url = z.url({ protocol: /^https?$/ }).max(2048);
const imageUrl = z.union([
  url,
  z
    .string()
    .max(2048)
    .regex(/^\/(?:shops|media)\/[^?#\\]+$/)
    .refine((path) => !path.split('/').includes('..'), 'Use a bundled image path'),
]);
const locale = z.enum(['it', 'en']);
const slug = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const category = z.enum(['pizza', 'bakery', 'hotel', 'other']);
const location = {
  category,
  address: text(300),
  city: text(120),
  country: text(120),
  website: url.optional(),
};

export const requestInput = z.object({
  ...location,
  businessName: text(160),
  oven: text(120),
  contactName: text(160),
  email: z.email().max(254),
  notes: z.string().trim().max(4000).optional(),
});

export const shopInput = z.object({
  ...location,
  slug,
  name: text(160),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  descriptionIt: text(6000).optional(),
  descriptionEn: text(6000).optional(),
  oven: text(120).optional(),
  imageUrl: imageUrl.optional(),
  imageAltIt: text(300).optional(),
  imageAltEn: text(300).optional(),
  visible: z.boolean().optional(),
});

const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: text(500) }),
  z.object({ type: z.literal('paragraph'), text: text(20000) }),
  z.object({
    type: z.literal('image'),
    image: imageUrl,
    sourceUrl: url.optional(),
    alt: z.string().max(300),
    aspectRatio: z.number().positive(),
  }),
]);

export const storyInput = z.object({
  title: text(300),
  summary: text(2000),
  category: text(120),
  blocks: z.array(block).min(1).max(300),
  coverImageUrl: imageUrl.optional(),
  coverImageAlt: text(300).optional(),
  sourceUrl: url.optional(),
  publish: z.boolean().default(false),
  visible: z.boolean().optional(),
});

const translation = storyInput.required({ visible: true });
export const storyGroupInput = z
  .object({
    slug,
    it: translation.optional(),
    en: translation.optional(),
  })
  .refine(({ it, en }) => it || en, 'Add at least one language version');

export const newStoryInput = storyInput.extend({ language: locale, slug });

export const reviewInput = z.object({
  status: z.enum(['submitted', 'in_review', 'needs_info', 'declined']),
  note: text(4000).optional(),
  details: requestInput.optional(),
});

export const approvalInput = shopInput.extend({ request: reviewInput.optional() });

export const pageInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const shopQuery = pageInput.extend({
  q: text(120).optional(),
  category: category.optional(),
});
export const storyQuery = pageInput.extend({ language: locale.default('it') });
export const storyKey = z.object({ language: locale, slug });
export const shopKey = slug;
export const requestKey = z.uuid();

export const draftKey = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('shop'), slug, language: z.literal('shared').transform(() => '') }),
  z.object({ kind: z.literal('story'), slug, language: locale }),
]);
export const draftInput = z.object({
  payload: z.record(z.string(), z.unknown()),
  revision: z.uuid().nullable(),
  newRecord: z.boolean().default(false),
});

const storyDraft = z.object({ payload: storyInput, revision: z.uuid().nullable() });
export const storyDraftBatch = z
  .object({
    it: storyDraft.optional(),
    en: storyDraft.optional(),
    newRecord: z.boolean(),
  })
  .refine(({ it, en }) => it || en, 'Add at least one language version');
