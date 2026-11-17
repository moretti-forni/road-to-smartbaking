import 'server-only';
import { invokeDataApi } from '../data/client.mjs';
import { ApiError } from './errors.mjs';
import { loadRuntimeSecrets } from '../config/runtime.mjs';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { handleApi } from './api.mjs';
import { getDb } from '../db/pool';
import { shopRecord, storyRecord, type Shop, type ApiStory } from '../../features/catalog/records';
import type { Story } from '../../data/content';
async function readPublic(url: string) {
  if (process.env.RTSM_DATA_FUNCTION_ARN) {
    const result = await invokeDataApi({ method: 'GET', url, body: undefined });
    if (result.status >= 400)
      throw new ApiError(
        result.status,
        (result.body as { error?: string }).error ?? 'Data request failed',
      );
    return result;
  }
  await loadRuntimeSecrets();
  return handleApi(
    getDb(),
    { method: 'GET', url, authorization: undefined, readBody: async () => undefined },
    undefined,
  );
}
export const getShop = cache(async (slug: string) => {
  if (process.env.NEXT_PUBLIC_CATALOG_SOURCE === 'fixtures') {
    const { publishedRestaurants } = await import('../../data/restaurants');
    return publishedRestaurants.find((item) => item.id === slug) ?? notFound();
  }
  const result = await readPublic(`/api/v1/shops/${encodeURIComponent(slug)}`).catch((error) => {
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
    const result = await readPublic(
      `/api/v1/stories/${language}/${encodeURIComponent(slug)}`,
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
