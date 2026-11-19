import { randomUUID, createHash } from 'node:crypto';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
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
  const finalKey = `media/${key.slice('incoming/'.length)}.webp`;
  try {
    const existing = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: finalKey, ChecksumMode: 'ENABLED' }),
    );
    if (
      !existing.ChecksumSHA256 ||
      existing.ContentType !== 'image/webp' ||
      !existing.Metadata?.width ||
      !existing.Metadata?.height
    )
      throw new MediaError(409, 'Stored image metadata is invalid.');
    return {
      url: `${base}/${finalKey}`,
      width: Number(existing.Metadata.width),
      height: Number(existing.Metadata.height),
    };
  } catch (error) {
    if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) throw error;
  }
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.ContentLength || object.ContentLength > maxUploadBytes || !object.Body)
    throw new MediaError(400, 'Invalid uploaded image.');
  const image = await optimizeImage(await object.Body.transformToByteArray());
  const checksum = createHash('sha256').update(image.bytes).digest('base64');
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: image.bytes,
        ContentType: 'image/webp',
        ChecksumSHA256: checksum,
        IfNoneMatch: '*',
        Metadata: { width: String(image.width), height: String(image.height) },
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 412) throw error;
  }
  const stored = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: finalKey, ChecksumMode: 'ENABLED' }),
  );
  if (stored.ContentLength !== image.bytes.length || stored.ChecksumSHA256 !== checksum)
    throw new MediaError(503, 'Could not verify the uploaded image. Please retry.');
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    /* Bucket lifecycle also expires temporary uploads. */
  }
  return { url: `${base}/${finalKey}`, width: image.width, height: image.height };
}
