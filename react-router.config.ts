import type { Config } from '@react-router/dev/config';
import { stories } from './app/data/content';
import { publishedRestaurants as restaurants } from './app/data/restaurants';
export default {
  ssr: false,
  prerender: [
    '/',
    ...['it', 'en'].flatMap((locale) => [
      `/${locale}`,
      `/${locale}/stories`,
      `/${locale}/saved`,
      `/${locale}/privacy`,
      ...stories.map((story) => `/${locale}/stories/${story.slug}`),
      ...restaurants.map((restaurant) => `/${locale}/restaurants/${restaurant.id}`),
    ]),
  ],
} satisfies Config;
