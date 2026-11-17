import { randomUUID } from 'node:crypto';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import sharp from 'sharp';
import { z } from 'zod';
export const maxUploadBytes = 10 * 1024 * 1024;
export class MediaError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const uploadInput = z.object({
  size: z.number().int().min(1).max(maxUploadBytes),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
});
export const completeInput = z.object({
  key: z
    .string()
    .regex(/^incoming\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
});
function configuration() {
  const bucket = process.env.S3_MEDIA_BUCKET;
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  if (!bucket || !base) throw new MediaError(503, 'Image uploads are not configured yet.');
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password)
    throw new MediaError(503, 'Invalid media delivery configuration.');
  return { bucket, base: base.replace(/\/$/, '') };
}
export async function optimizeImage(bytes) {
  if (!bytes.length || bytes.length > maxUploadBytes)
    throw new MediaError(400, 'Choose an image up to 10 MB.');
  try {
    const image = sharp(bytes, { limitInputPixels: 40000000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format) || (metadata.pages ?? 1) > 1)
      throw new Error('Unsupported image');
    const result = await image
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    return { bytes: result.data, width: result.info.width, height: result.info.height };
  } catch {
    throw new MediaError(
      400,
      'This file is not a supported still image. Use JPEG, PNG, WebP or AVIF.',
    );
  }
}
export async function startUpload(input, client, sign = createPresignedPost) {
  const { size, contentType } = uploadInput.parse(input);
  const { bucket } = configuration();
  client ??= new S3Client({ region: process.env.RTSM_AWS_REGION || process.env.AWS_REGION });
  const key = `incoming/${randomUUID()}`;
  const signed = await sign(client, {
    Bucket: bucket,
    Key: key,
    Expires: 300,
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['content-length-range', size, size],
      ['eq', '$Content-Type', contentType],
    ],
  });
  return { ...signed, key };
}
export async function finishUpload(input, client) {
  const { key } = completeInput.parse(input);
  const { bucket, base } = configuration();
  client ??= new S3Client({ region: process.env.RTSM_AWS_REGION || process.env.AWS_REGION });
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.ContentLength || object.ContentLength > maxUploadBytes || !object.Body)
    throw new MediaError(400, 'Invalid uploaded image.');
  const image = await optimizeImage(await object.Body.transformToByteArray());
  const finalKey = `media/${randomUUID()}.webp`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: finalKey,
      Body: image.bytes,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    /* Bucket lifecycle also expires temporary uploads. */
  }
  return { url: `${base}/${finalKey}`, width: image.width, height: image.height };
}
