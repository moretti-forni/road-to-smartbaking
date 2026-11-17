// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  completeInput,
  optimizeImage,
  startUpload,
  finishUpload,
  uploadInput,
} from '../src/server/media/uploads.mjs';
afterEach(() => vi.unstubAllEnvs());
describe('staff image upload pipeline', () => {
  it('rejects oversized uploads, active formats and arbitrary object paths', () => {
    expect(
      uploadInput.safeParse({ size: 11 * 1024 * 1024, contentType: 'image/jpeg' }).success,
    ).toBe(false);
    expect(uploadInput.safeParse({ size: 100, contentType: 'image/svg+xml' }).success).toBe(false);
    expect(completeInput.safeParse({ key: '../private/data' }).success).toBe(false);
    expect(completeInput.safeParse({ key: 'media/some-existing-file.webp' }).success).toBe(false);
  });
  it('constrains signed forms to one temporary object, MIME type and exact file size', async () => {
    vi.stubEnv('S3_MEDIA_BUCKET', 'test-images');
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', 'https://images.example.com');
    const sign = vi
      .fn()
      .mockResolvedValue({ url: 'https://test-images.s3.amazonaws.com', fields: {} });
    const result = await startUpload({ size: 1024, contentType: 'image/jpeg' }, {}, sign);
    expect(result.key).toMatch(/^incoming\//);
    expect(sign.mock.calls[0][1]).toMatchObject({
      Bucket: 'test-images',
      Expires: 300,
      Conditions: [
        ['content-length-range', 1024, 1024],
        ['eq', '$Content-Type', 'image/jpeg'],
      ],
    });
  });
  it('validates decoded content and normalizes size and format', async () => {
    const source = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: '#c33' },
    })
      .jpeg()
      .toBuffer();
    const image = await optimizeImage(source);
    expect(image.width).toBe(2400);
    expect(image.height).toBe(1200);
    expect((await sharp(image.bytes).metadata()).format).toBe('webp');
    await expect(
      optimizeImage(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(optimizeImage(Buffer.from('not an image'))).rejects.toMatchObject({ status: 400 });
  });
  it('publishes processed images and removes the temporary original', async () => {
    vi.stubEnv('S3_MEDIA_BUCKET', 'test-images');
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', 'https://images.example.com');
    const source = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#c33' },
    })
      .png()
      .toBuffer();
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        ContentLength: source.length,
        Body: { transformToByteArray: async () => source },
      })
      .mockResolvedValue({});
    const result = await finishUpload(
      { key: 'incoming/12345678-1234-4123-8123-123456789abc' },
      { send },
    );
    expect(result.url).toMatch(/^https:\/\/images.example.com\/media\/.+\.webp$/);
    expect(send.mock.calls[1][0].input.ContentType).toBe('image/webp');
    expect(send.mock.calls[2][0].input.Key).toBe('incoming/12345678-1234-4123-8123-123456789abc');
  });
});
