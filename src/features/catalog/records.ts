import type { Restaurant } from '../../data/restaurants';
import type { StorySummary } from '../../data/story-index';
export type Shop = {
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

export type ApiStory = Omit<StorySummary, 'cover' | 'readMinutes' | 'sourceUrl'> & {
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  sourcePublishedAt: string | null;
  readMinutes: number | null;
  sourceUrl: string | null;
};

export function shopRecord(shop: Shop): Restaurant {
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

export function storyRecord(story: ApiStory): StorySummary {
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
