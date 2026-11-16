import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/redirect.tsx'),
  route('admin', 'routes/admin.tsx'),
  route(':locale', 'routes/layout.tsx', [
    index('routes/explore.tsx'),
    route('stories', 'routes/stories.tsx'),
    route('stories/:slug', 'routes/story.tsx'),
    route('restaurants/:slug', 'routes/restaurant.tsx'),
    route('saved', 'routes/saved.tsx'),
    route('privacy', 'routes/privacy.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
