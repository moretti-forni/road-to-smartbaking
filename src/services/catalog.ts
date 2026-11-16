import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { publishedRestaurants } from '../data/restaurants';
import type { Story } from '../data/content';
import { storyIndex, type StorySummary } from '../data/story-index';
import { publicHttp, usesPublicApi } from './http';

import { shopRecord, storyRecord, type Shop, type ApiStory } from '../features/catalog/records';

async function list<T>(path: string, signal?: AbortSignal, params?: Record<string, string>) {
  const records: T[] = [];
  const limit = 100;
  while (true) {
    const { data } = await publicHttp.get<{ items: T[] }>(path, {
      params: { ...params, limit, offset: records.length },
      signal,
    });
    records.push(...data.items);
    if (data.items.length < limit) return records;
  }
}

async function get<T>(path: string, signal: AbortSignal) {
  try {
    return (await publicHttp.get<T>(path, { signal })).data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return undefined;
    throw error;
  }
}

export async function fetchShops(signal?: AbortSignal) {
  return (await list<Shop>('/shops', signal)).map(shopRecord);
}

export async function fetchShop(slug: string, signal: AbortSignal) {
  const shop = await get<Shop>(`/shops/${encodeURIComponent(slug)}`, signal);
  if (!shop) throw new Response('Not found', { status: 404 });
  return shopRecord(shop);
}

async function fetchStories(locale: string | undefined, signal: AbortSignal) {
  const languages = locale === 'en' ? ['en', 'it'] : ['it'];
  const lists = await Promise.all(
    languages.map((language) => list<ApiStory>('/stories', signal, { language })),
  );
  const stories = new Map<string, StorySummary>();
  for (const item of lists.flat()) {
    if (!stories.has(item.slug)) stories.set(item.slug, storyRecord(item));
  }
  return [...stories.values()].sort(
    (a, b) => Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? ''),
  );
}

export async function fetchStory(slug: string, locale: string | undefined, signal: AbortSignal) {
  const key = encodeURIComponent(slug);
  type Detail = ApiStory & Pick<Story, 'blocks'>;
  const translated = locale === 'en' ? await get<Detail>(`/stories/en/${key}`, signal) : undefined;
  const story = translated ?? (await get<Detail>(`/stories/it/${key}`, signal));
  if (!story) throw new Response('Not found', { status: 404 });
  return { ...storyRecord(story), blocks: story.blocks };
}

export function useStories(locale?: string, enabled = true) {
  return useQuery({
    queryKey: ['story-catalog', locale],
    queryFn: ({ signal }) => fetchStories(locale, signal),
    enabled: enabled && usesPublicApi,
    staleTime: 0,
    initialData: usesPublicApi ? undefined : storyIndex,
  });
}

export function useShops(enabled = true) {
  return useQuery({
    queryKey: ['shop-catalog'],
    queryFn: ({ signal }) => fetchShops(signal),
    enabled: enabled && usesPublicApi,
    staleTime: 0,
    initialData: usesPublicApi ? undefined : publishedRestaurants,
  });
}
