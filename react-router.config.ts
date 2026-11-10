import type { Config } from '@react-router/dev/config';
import { stories } from './app/data/content';
import { publishedRestaurants as restaurants } from './app/data/restaurants';
const basePath = process.env.VITE_BASE_PATH?.replace(/\/$/, '') || '/';

export default {
  basename: basePath,
  ssr: false,
  prerender: [
    '/',
    '/admin',
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
