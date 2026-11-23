import { expect, test } from '@playwright/test';
test('staff password signs in, restores a session and logs out', async ({ page }) => {
  const email = 'noreply-app@morettiforni.com';
  await page.goto('/admin');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Invalid email or password.');
  await page.getByLabel('Password', { exact: true }).fill('browser-test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === 'rtsm_staff_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Strict');
  expect(await page.evaluate(() => document.cookie)).not.toContain('rtsm_staff_session');
  await page.route('**/api/v1/admin/media/uploads', (route) =>
    route.fulfill({
      json: {
        url: 'http://127.0.0.1:5175/mock-s3',
        fields: { key: 'incoming/test' },
        key: 'incoming/test',
      },
    }),
  );
  await page.route('**/mock-s3', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/v1/admin/media/complete', (route) =>
    route.fulfill({
      json: { url: 'https://images.example.test/media/test.webp', width: 300, height: 200 },
    }),
  );
  await page.getByRole('button', { name: 'Shops', exact: true }).click();
  await page.getByRole('button', { name: 'New shop', exact: true }).click();
  await page.getByLabel('Upload image', { exact: true }).setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT0sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('input[name="imageUrl"]')).toHaveValue(
    'https://images.example.test/media/test.webp',
  );
  await expect(
    page.getByText('Image uploaded. Add alt text, then save your draft to keep it.'),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Work email')).toBeVisible();
  expect((await page.request.get('/api/v1/admin/shops')).status()).toBe(401);
});
