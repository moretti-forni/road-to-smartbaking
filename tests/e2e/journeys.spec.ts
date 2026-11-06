import { expect, test } from '@playwright/test';

test('discovery search, empty recovery, restaurant details and saved persistence', async ({
  page,
}, testInfo) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: /Find your next/ })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search a place or a city' });
  await search.fill('no-such-city');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'No places found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Forno Rosso', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save place: Forno Rosso', exact: true }).click();
  await page.goto('/en/saved');
  await expect(page.getByRole('heading', { name: 'Forno Rosso', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Forno Rosso', exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Forno Rosso', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Forno Rosso.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Directions', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('restaurant.png'), fullPage: true });
  await page.getByRole('button', { name: 'Remove from saved: Forno Rosso' }).click();
  await page.goto('/en/saved');
  await expect(
    page.getByRole('heading', { name: 'Your journey is still waiting to be written.' }),
  ).toBeVisible();
});

test('stories carousel, filtering, deep article route and language switch', async ({
  page,
}, testInfo) => {
  await page.goto('/it/stories');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dietro ogni cottura');
  await page.getByRole('button', { name: 'Storia successiva', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Storie 2', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
  const search = page.getByRole('textbox', { name: 'Cerca nelle storie' });
  await search.fill('Bedin');
  await expect(page.locator('.stories-grid article')).toHaveCount(1);
  await page.locator('.stories-grid h3 a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bedin');
  await expect(page.locator('.article-body p').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bedin');
  await page.getByRole('link', { name: 'Switch to English' }).click();
  await expect(page.getByText(/Original article in Italian/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.screenshot({ path: testInfo.outputPath('article.png') });
});

test('responsive layout and navigation work without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.goto('/en/stories');
  await expect(page.getByRole('link', { name: 'RoadToSmartBaking' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('stories.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /Explore/ })
    .click();
  await expect(page.getByRole('heading', { name: /Find your next/ })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Locations on the map' })).toBeVisible();
  await expect(
    page.getByText('Choose a map pin: its matching location card is highlighted below.'),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('explore.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unknown story and unsupported locale fail safely', async ({ page }) => {
  await page.goto('/en/stories/not-a-real-story');
  await expect(
    page.getByText('Questa pagina non è disponibile. / This page is not available.'),
  ).toBeVisible();
  await page.goto('/fr');
  await expect(
    page.getByText('Questa pagina non è disponibile. / This page is not available.'),
  ).toBeVisible();
});

test('denied location and offline map retain manual discovery', async ({ page }) => {
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
    });
  });
  await page.goto('/en');
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(
    page.getByText('Location unavailable. You can still search for a city.'),
  ).toBeVisible();
  await expect(
    page.getByText('Map tiles are unavailable. You can still use the places list.'),
  ).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search a place or a city' });
  await search.fill('Bologna');
  await search.press('Enter');
  await expect(page.locator('#places article')).toHaveCount(4);
});
