import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // Tests opt into mocked transports explicitly. Amplify branch settings must
    // never route unit-test submissions to live Lambda, SES, S3, or Secrets Manager.
    // TEST_DATABASE_URL remains explicit for the isolated PostgreSQL suites.
    env: {
      RTSM_DATA_FUNCTION_ARN: '',
      RTSM_STAFF_FUNCTION_ARN: '',
      RTSM_STAFF_PASSWORD_HASHES: '',
      RTSM_RUNTIME_SECRET_ARN: '',
      RTSM_APP_ORIGIN: 'http://localhost',
      RTSM_AUTH_MODE: 'legacy',
      RTSM_ALLOWED_ORIGINS: '',
      S3_MEDIA_BUCKET: '',
      MEDIA_PUBLIC_BASE_URL: '',
      NEXT_PUBLIC_CATALOG_SOURCE: 'api',
      NEXT_PUBLIC_MEDIA_BASE_URL: '',
    },
  },
});
