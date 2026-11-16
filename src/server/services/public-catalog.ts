import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { handleApi } from './api.mjs';
import { getDb } from '../db/pool';
import { shopRecord, storyRecord, type Shop, type ApiStory } from '../../features/catalog/records';
import type { Story } from '../../data/content';
export const getShop = cache(async (slug: string) => {
  if (process.env.NEXT_PUBLIC_CATALOG_SOURCE === 'fixtures') {
    const { publishedRestaurants } = await import('../../data/restaurants');
    return publishedRestaurants.find((item) => item.id === slug) ?? notFound();
  }
  const result = await handleApi(
    getDb(),
    {
      method: 'GET',
      url: `/api/v1/shops/${encodeURIComponent(slug)}`,
      authorization: undefined,
      readBody: async () => undefined,
    },
    undefined,
  ).catch((error) => {
    if (error.status === 404) notFound();
    throw error;
  });
  return shopRecord(result.body as Shop);
});
export const getStory = cache(async (slug: string, locale: string) => {
  if (process.env.NEXT_PUBLIC_CATALOG_SOURCE === 'fixtures') {
    const { stories } = await import('../../data/content');
    return (
      stories.find((item) => item.slug === slug && item.language === locale) ??
      stories.find((item) => item.slug === slug && item.language === 'it') ??
      notFound()
    );
  }
  for (const language of locale === 'en' ? ['en', 'it'] : ['it']) {
    const result = await handleApi(
      getDb(),
      {
        method: 'GET',
        url: `/api/v1/stories/${language}/${encodeURIComponent(slug)}`,
        authorization: undefined,
        readBody: async () => undefined,
      },
      undefined,
    ).catch((error) => {
      if (error.status === 404) return undefined;
      throw error;
    });
    if (result) {
      const story = result.body as ApiStory & Pick<Story, 'blocks'>;
      return { ...storyRecord(story), blocks: story.blocks };
    }
  }
  notFound();
});
