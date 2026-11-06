import { describe, expect, it } from 'vitest';
import {
  distanceKm,
  filterRestaurants,
  getDiscoverySuggestions,
  parseQuery,
} from '../app/services/discovery';
import { restaurants } from '../app/data/restaurants';
import { stories, imageUrl, storyCategory } from '../app/data/content';
import { readSaved } from '../app/components/providers';
import { resources } from '../app/i18n';
import { existsSync } from 'node:fs';

describe('discovery query and filtering', () => {
  it('rejects malformed bounds and coordinates', () => {
    expect(
      parseQuery(new URLSearchParams('bounds=nan,1,2,3&lat=100&lng=1&sort=distance')),
    ).toMatchObject({ bounds: undefined, lat: undefined, sort: 'name' });
    expect(parseQuery(new URLSearchParams('bounds=50,10,40,20'))).toMatchObject({
      bounds: undefined,
    });
  });
  it('accepts and applies bounded city/category queries', () => {
    const query = parseQuery(new URLSearchParams('q=roma&kind=pizza&bounds=40,10,44,14'));
    const result = filterRestaurants(restaurants, query);
    expect(result).toHaveLength(3);
    expect(
      result.every((restaurant) => restaurant.city === 'Roma' && restaurant.kind === 'pizza'),
    ).toBe(true);
  });
  it('keeps a selected place focused on its exact city', () => {
    const result = filterRestaurants(restaurants, parseQuery(new URLSearchParams('city=Roma')));
    expect(result).toHaveLength(4);
    expect(result.every((restaurant) => restaurant.city === 'Roma')).toBe(true);
  });
  it('keeps every RoadToSmartBaking location map-ready with its poster image', () => {
    expect(restaurants).toHaveLength(43);
    for (const restaurant of restaurants) {
      expect(restaurant.mapsUrl).toContain('google.com/maps/search');
      expect(Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng)).toBe(true);
      expect(existsSync(`public${restaurant.image}`)).toBe(true);
    }
  });
  it('returns a useful empty result and sorts by distance only with a reference point', () => {
    expect(
      filterRestaurants(restaurants, parseQuery(new URLSearchParams('q=unknown-city'))),
    ).toEqual([]);
    const reference = restaurants[0];
    const result = filterRestaurants(
      restaurants,
      parseQuery(new URLSearchParams(`lat=${reference.lat}&lng=${reference.lng}&sort=distance`)),
    );
    expect(result[0].id).toBe(reference.id);
    expect(distanceKm(reference.lat, reference.lng, reference)).toBe(0);
  });
  it('suggests worldwide places, restaurant names, and matching addresses', () => {
    expect(getDiscoverySuggestions('roma').some((suggestion) => suggestion.type === 'place')).toBe(
      true,
    );
    expect(getDiscoverySuggestions('grensen').some(({ label }) => label === 'Café Grensen')).toBe(
      true,
    );
    expect(getDiscoverySuggestions('east coast park').some(({ label }) => label === 'FICO')).toBe(
      true,
    );
    expect(
      filterRestaurants(restaurants, parseQuery(new URLSearchParams('q=paglia'))).some(
        ({ name }) => name === 'Paglià',
      ),
    ).toBe(true);
  });
});
describe('content and persistence boundaries', () => {
  it('has unique story routes and existing images', () => {
    expect(new Set(stories.map((story) => story.slug)).size).toBe(stories.length);
    for (const story of stories) {
      expect(existsSync(`public${imageUrl(story.cover.image)}`)).toBe(true);
      expect(['pizza', 'bakery', 'people']).toContain(storyCategory(story));
    }
  });
  it('recovers corrupted saved data and removes duplicate IDs', () => {
    expect(readSaved('not-json')).toEqual([]);
    expect(readSaved('{"id":"test"}')).toEqual([]);
    expect(readSaved('["one",12,"one","two"]')).toEqual(['one', 'two']);
  });
  it('keeps both interface languages complete', () => {
    expect(Object.keys(resources.it.translation).sort()).toEqual(
      Object.keys(resources.en.translation).sort(),
    );
  });
});
