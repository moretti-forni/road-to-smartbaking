import { publicPath } from './public-path';
/** Resolve existing catalogue media through the CDN, with local development fallback. */
export function mediaPath(path: string) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');
  const local = publicPath(path);
  return base && /^\/(?:shops\/|shops-webp\/|media\/|ovens\/|mf_factory\.jpg$)/.test(local)
    ? `${base}/media/catalog${local}`
    : local;
}
