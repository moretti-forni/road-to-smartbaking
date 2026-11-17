const required = ['RTSM_APP_ORIGIN', 'RTSM_AUTH_SECRET'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const origin = new URL(process.env.RTSM_APP_ORIGIN);
if (origin.protocol !== 'https:' || origin.origin !== process.env.RTSM_APP_ORIGIN)
  throw new Error('RTSM_APP_ORIGIN must be an HTTPS origin without a trailing slash');
if (process.env.RTSM_AUTH_SECRET.length < 32)
  throw new Error('RTSM_AUTH_SECRET must have at least 32 characters');
if (process.env.NEXT_PUBLIC_CATALOG_SOURCE === 'fixtures')
  throw new Error('Staging must use the database catalog');
if (process.env.RTSM_STAFF_TOKEN)
  throw new Error('Remove the development staff token from staging');

const mail =
  process.env.RTSM_MAIL_PROVIDER === 'ses'
    ? ['SES_FROM', 'AWS_REGION']
    : ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD'];
for (const name of mail) if (!process.env[name]) throw new Error(`Missing ${name}`);

if (!process.env.DATABASE_URL && !process.env.STAGING_DB_PASSWORD)
  throw new Error('Set DATABASE_URL or STAGING_DB_PASSWORD');
if (process.env.STAGING_DB_PASSWORD && !/^[a-f0-9]{32,}$/.test(process.env.STAGING_DB_PASSWORD))
  throw new Error('Use a hex staging database password with at least 32 characters');

console.log('Staging configuration checks passed (values withheld).');
