import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { publishedRestaurants, type Restaurant } from '../data/restaurants';
import type { Story } from '../data/content';
import { storyIndex, type StorySummary } from '../data/story-index';
import { publicHttp, usesPublicApi } from './http';

type Shop = {
  slug: string;
  name: string;
  city: string;
  address: string;
  category: Restaurant['kind'];
  latitude: number;
  longitude: number;
  oven: string | null;
  imageUrl: string | null;
  imageAltIt: string | null;
  imageAltEn: string | null;
  website: string | null;
  descriptionIt: string | null;
  descriptionEn: string | null;
  mapsUrl: string | null;
  locationNote: string | null;
  coordinatePrecision: Restaurant['coordinatePrecision'] | null;
};

type ApiStory = Omit<StorySummary, 'cover' | 'readMinutes' | 'sourceUrl'> & {
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  sourcePublishedAt: string | null;
  readMinutes: number | null;
  sourceUrl: string | null;
};

function shopRecord(shop: Shop): Restaurant {
  return {
    id: shop.slug,
    name: shop.name,
    city: shop.city,
    address: shop.address,
    kind: shop.category,
    lat: shop.latitude,
    lng: shop.longitude,
    oven: shop.oven ?? '',
    image: shop.imageUrl ?? '',
    imageAlt: { it: shop.imageAltIt, en: shop.imageAltEn },
    website: shop.website ?? undefined,
    description: { it: shop.descriptionIt ?? '', en: shop.descriptionEn ?? '' },
    mapsUrl:
      shop.mapsUrl ??
      `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`,
    coordinatePrecision: shop.coordinatePrecision ?? 'address',
    locationStatus: '',
    locationNote: shop.locationNote ?? '',
  };
}

function storyRecord(story: ApiStory): StorySummary {
  return {
    slug: story.slug,
    language: story.language,
    title: story.title,
    summary: story.summary,
    category: story.category,
    publishedAt: story.sourcePublishedAt ?? story.publishedAt,
    sourceUrl: story.sourceUrl ?? '',
    readMinutes: story.readMinutes ?? 0,
    cover: { image: story.coverImageUrl ?? '', alt: story.coverImageAlt ?? '', aspectRatio: 1.8 },
  };
}

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
