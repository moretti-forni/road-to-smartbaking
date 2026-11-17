import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'staff-auth.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5175', browserName: 'chromium' },
  webServer: {
    command: 'npm run dev -- --port 5175',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '',
      NEXT_PUBLIC_CATALOG_SOURCE: 'database',
      NEXT_PUBLIC_API_BASE_URL: '/api/v1',
      RTSM_APP_ORIGIN: 'http://127.0.0.1:5175',
      RTSM_AUTH_SECRET: 'local-browser-test-only-secret-not-for-deployment',
      RTSM_MAIL_PROVIDER: 'smtp',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_FROM: 'noreply-test@morettiforni.com',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
    },
  },
});
