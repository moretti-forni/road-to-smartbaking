import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaPath } from '../src/utils/media-path';
import { shopImage } from '../src/data/restaurants';
import { imageUrl } from '../src/data/story-index';
import { resolveOvens } from '../src/data/ovens';
afterEach(() => vi.unstubAllEnvs());
describe('catalogue image delivery', () => {
  it('keeps local paths when CDN configuration is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', '');
    expect(imageUrl('photo')).toBe('/media/photo.jpg');
    expect(shopImage('/shops/photo.jpg', 'cards')).toBe('/shops-webp/cards/photo.webp');
  });
  it('uses CDN paths for catalogue media and preserves external URLs and app icons', () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'https://images.example.com/');
    expect(imageUrl('photo')).toBe('https://images.example.com/media/catalog/media/photo.jpg');
    expect(shopImage('/shops/photo.jpg', 'cards')).toBe(
      'https://images.example.com/media/catalog/shops-webp/cards/photo.webp',
    );
    expect(shopImage('/shops/photo.jpg', 'heroes')).toBe(
      'https://images.example.com/media/catalog/shops-webp/heroes/photo.webp',
    );
    expect(mediaPath('/mf_factory.jpg')).toBe(
      'https://images.example.com/media/catalog/mf_factory.jpg',
    );
    expect(resolveOvens('serieS')[0].logo).toContain(
      'https://images.example.com/media/catalog/ovens/',
    );
    expect(imageUrl('https://other.example.com/image.jpg')).toBe(
      'https://other.example.com/image.jpg',
    );
    expect(mediaPath('/moretti-arch.svg')).toBe('/moretti-arch.svg');
    expect(mediaPath('')).toBe('');
  });
});
