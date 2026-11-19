import { writeFile } from 'node:fs/promises';
// Only non-secret runtime settings belong in Amplify deployment artifacts.
const names = [
  'RTSM_RUNTIME_SECRET_ARN',
  'RTSM_DATA_FUNCTION_ARN',
  'RTSM_STAFF_FUNCTION_ARN',
  'RTSM_AWS_REGION',
  'RTSM_APP_ORIGIN',
  'RTSM_DB_SCHEMA',
  'RTSM_AUTH_MODE',
  'RTSM_MAIL_PROVIDER',
  'SES_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM',
  'S3_MEDIA_BUCKET',
  'MEDIA_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_MEDIA_BASE_URL',
  'RTSM_ALLOWED_ORIGINS',
  'NEXT_PUBLIC_MAP_TILE_URL',
  'NEXT_PUBLIC_MAP_ATTRIBUTION',
  'NEXT_PUBLIC_CARTO_BASEMAP_KEY',
];
if (
  (!process.env.RTSM_RUNTIME_SECRET_ARN && !process.env.RTSM_DATA_FUNCTION_ARN) ||
  !process.env.RTSM_APP_ORIGIN
)
  throw new Error('Configure RTSM_RUNTIME_SECRET_ARN and RTSM_APP_ORIGIN for the Amplify branch');
if (new URL(process.env.RTSM_APP_ORIGIN).protocol !== 'https:')
  throw new Error('Amplify requires an HTTPS application origin');
if (process.env.NEXT_PUBLIC_CATALOG_SOURCE === 'fixtures')
  throw new Error('Do not deploy the fixture catalog to staging');
const lines = names
  .filter((name) => process.env[name])
  .map((name) => `${name}=${JSON.stringify(process.env[name])}`);
await writeFile('.env.production', `${lines.join('\n')}\n`, { mode: 0o600 });
console.log('Prepared allowlisted, non-secret Amplify runtime configuration.');
