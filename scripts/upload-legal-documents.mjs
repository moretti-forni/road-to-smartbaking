import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { legalDocuments, privacyNoticeUrl } from '../src/features/catalog/legal-documents.mjs';
const { values } = parseArgs({ options: { apply: { type: 'boolean' } } });
const bucket = process.env.S3_MEDIA_BUCKET;
if (values.apply && !bucket) throw new Error('S3_MEDIA_BUCKET required');
const client = new S3Client({ region: process.env.RTSM_AWS_REGION || 'eu-west-1' });
try {
  for (const [language, document] of Object.entries(legalDocuments)) {
    const body = await readFile(document.file);
    const checksum = createHash('sha256').update(body).digest('base64');
    if (
      body.subarray(0, 5).toString() !== '%PDF-' ||
      createHash('sha256').update(body).digest('hex') !== document.sha256
    )
      throw new Error(`PDF differs from its published manifest: ${document.file}`);
    if (values.apply) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: document.key,
            Body: body,
            ContentType: 'application/pdf',
            ContentDisposition: `inline; filename="RoadToSmartBaking-Privacy-${language.toUpperCase()}.pdf"`,
            CacheControl: 'public, max-age=31536000, immutable',
            ChecksumSHA256: checksum,
            Metadata: { sha256: document.sha256 },
            IfNoneMatch: '*',
          }),
        );
      } catch (error) {
        if (error.$metadata?.httpStatusCode !== 412) throw error;
      }
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: document.key, ChecksumMode: 'ENABLED' }),
      );
      if (
        head.ContentLength !== body.length ||
        head.ContentType !== 'application/pdf' ||
        head.ChecksumSHA256 !== checksum
      )
        throw new Error(`S3 verification failed for ${language}`);
    }
    console.log(
      JSON.stringify({
        language,
        mode: values.apply ? 'verified' : 'dry-run',
        bytes: body.length,
        url: privacyNoticeUrl(language),
      }),
    );
  }
} finally {
  client.destroy();
}
