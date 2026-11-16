import { publishedRestaurants as restaurants, type Restaurant } from '../data/restaurants';

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}
export interface DiscoveryQuery {
  search: string;
  city?: string;
  kind: string;
  bounds?: Bounds;
  lat?: number;
  lng?: number;
  sort: string;
}
export interface DiscoverySuggestion {
  id: string;
  type: 'place' | 'restaurant';
  label: string;
  detail: string;
  query: string;
  lat: number;
  lng: number;
}
export function normaliseSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function searchScore(value: string, search: string) {
  const normalisedValue = normaliseSearch(value);
  if (normalisedValue === search) return 0;
  if (normalisedValue.startsWith(search)) return 1;
  if (normalisedValue.includes(search)) return 2;
  return 3;
}
function matchesSearch(value: string, search: string) {
  const terms = normaliseSearch(search).split(' ').filter(Boolean);
  const haystack = normaliseSearch(value);
  return !terms.length || terms.every((term) => haystack.includes(term));
}
export function getDiscoverySuggestions(
  value: string,
  limit = 8,
  records = restaurants,
): DiscoverySuggestion[] {
  const search = normaliseSearch(value);
  if (search.length < 2) return [];

  const places = new Map<string, Restaurant[]>();
  records.forEach((restaurant) => {
    const records = places.get(restaurant.city) ?? [];
    records.push(restaurant);
    places.set(restaurant.city, records);
  });
  const placeSuggestions = [...places.entries()]
    .filter(([city, records]) =>
      matchesSearch(`${city} ${records.map(({ address }) => address).join(' ')}`, search),
    )
    .map(([city, records]) => {
      const latitude =
        records.reduce((total, restaurant) => total + restaurant.lat, 0) / records.length;
      const longitude =
        records.reduce((total, restaurant) => total + restaurant.lng, 0) / records.length;
      return {
        id: `place-${city}`,
        type: 'place' as const,
        label: city,
        detail: `${records.length} ${records.length === 1 ? 'location' : 'locations'}`,
        query: city,
        lat: latitude,
        lng: longitude,
        score: Math.min(
          searchScore(city, search),
          ...records.map((restaurant) => searchScore(restaurant.address, search)),
        ),
      };
    });
  const restaurantSuggestions = records
    .filter((restaurant) =>
      matchesSearch(`${restaurant.name} ${restaurant.city} ${restaurant.address}`, search),
    )
    .map((restaurant) => ({
      id: restaurant.id,
      type: 'restaurant' as const,
      label: restaurant.name,
      detail: `${restaurant.city} · ${restaurant.address}`,
      query: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
      score: Math.min(
        searchScore(restaurant.name, search),
        searchScore(restaurant.city, search) + 1,
        searchScore(restaurant.address, search) + 2,
      ),
    }));

  return [...placeSuggestions, ...restaurantSuggestions]
    .sort((first, second) => first.score - second.score || first.label.localeCompare(second.label))
    .slice(0, limit);
}
export function parseQuery(params: URLSearchParams): DiscoveryQuery {
  const boundsValues = params.get('bounds')?.split(',').map(Number);
  const validBounds =
    boundsValues?.length === 4 &&
    boundsValues.every(Number.isFinite) &&
    boundsValues[0] <= boundsValues[2] &&
    boundsValues[1] <= boundsValues[3] &&
    boundsValues[0] >= -90 &&
    boundsValues[2] <= 90 &&
    boundsValues[1] >= -180 &&
    boundsValues[3] <= 180;
  const latitude = params.has('lat') ? Number(params.get('lat')) : NaN;
  const longitude = params.has('lng') ? Number(params.get('lng')) : NaN;
  const validPosition =
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180;
  return {
    search: params.get('q')?.trim() ?? '',
    city: params.get('city')?.trim() || undefined,
    kind: ['pizza', 'bakery', 'hotel', 'other'].includes(params.get('kind') ?? '')
      ? params.get('kind')!
      : 'all',
    bounds: validBounds
      ? {
          south: boundsValues[0],
          west: boundsValues[1],
          north: boundsValues[2],
          east: boundsValues[3],
        }
      : undefined,
    lat: validPosition ? latitude : undefined,
    lng: validPosition ? longitude : undefined,
    sort: params.get('sort') === 'distance' && validPosition ? 'distance' : 'name',
  };
}
export function distanceKm(lat: number, lng: number, restaurant: Restaurant) {
  const radians = Math.PI / 180;
  const latitudeDelta = (restaurant.lat - lat) * radians;
  const longitudeDelta = (restaurant.lng - lng) * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat * radians) *
      Math.cos(restaurant.lat * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
export function filterRestaurants(records: Restaurant[], query: DiscoveryQuery) {
  return records
    .filter((restaurant) => {
      const bounds = query.bounds;
      return (
        matchesSearch(
          `${restaurant.name} ${restaurant.city} ${restaurant.address}`,
          query.search,
        ) &&
        (!query.city || restaurant.city === query.city) &&
        (query.kind === 'all' || restaurant.kind === query.kind) &&
        (!bounds ||
          (restaurant.lat >= bounds.south &&
            restaurant.lat <= bounds.north &&
            restaurant.lng >= bounds.west &&
            restaurant.lng <= bounds.east))
      );
    })
    .sort((first, second) =>
      query.sort === 'distance' && query.lat !== undefined && query.lng !== undefined
        ? distanceKm(query.lat, query.lng, first) - distanceKm(query.lat, query.lng, second)
        : first.name.localeCompare(second.name),
    );
}
export async function discoverRestaurants(query: DiscoveryQuery, signal?: AbortSignal) {
  signal?.throwIfAborted();
  return filterRestaurants(restaurants, query);
}
