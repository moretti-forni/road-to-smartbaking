import { expect, test } from '@playwright/test';
test('company email code signs in, restores a session and logs out', async ({ page, request }) => {
  const email = `browser-${Date.now()}@morettiforni.com`;
  await page.goto('/admin');
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Send access code' }).click();
  await expect(page.getByLabel('Access code')).toBeVisible();
  let code = '';
  await expect
    .poll(async () => {
      const response = await request.get('http://127.0.0.1:8025/api/v1/messages');
      const data = await response.json();
      const message = data.messages.find((item: { To: { Address: string }[] }) =>
        item.To.some((to) => to.Address === email),
      );
      if (!message) return false;
      const full = await (
        await request.get(`http://127.0.0.1:8025/api/v1/message/${message.ID}`)
      ).json();
      code = full.Text.match(/code: (\d{6})/)?.[1] || '';
      return Boolean(code);
    })
    .toBe(true);
  await page.getByLabel('Access code').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText('Invalid or expired code.');
  await page.getByLabel('Access code').fill(code);
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
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
  await page
    .getByLabel('Upload image', { exact: true })
    .setInputFiles({
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
