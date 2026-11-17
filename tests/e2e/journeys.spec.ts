import { expect, test } from '@playwright/test';

test('discovery search, empty recovery, restaurant details and saved persistence', async ({
  page,
}, testInfo) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: /Discover places with/ })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search a place or a city' });
  await search.fill('no-such-city');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'No places found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'FICO', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save place: FICO', exact: true }).click();
  await page.goto('/en/saved');
  await expect(page.getByRole('heading', { name: 'FICO', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'FICO', exact: true })).toBeVisible();
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'FICO', exact: true }) })
    .getByRole('link')
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'FICO' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Directions', exact: true })).toHaveAttribute(
    'href',
    /google.com/,
  );
  await page.screenshot({ path: testInfo.outputPath('restaurant.png'), fullPage: true });
  await page.getByRole('button', { name: 'Remove from saved: FICO' }).click();
  await page.goto('/en/saved');
  await expect(
    page.getByRole('heading', { name: 'Your journey is still waiting to be written.' }),
  ).toBeVisible();
});

test('stories carousel, filtering, deep article route and language switch', async ({
  page,
}, testInfo) => {
  await page.goto('/it/stories');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Storie di');
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
  await expect(page.getByRole('link', { name: '#RoadToSmartBaking', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('stories.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(testInfo.project.name === 'mobile' ? '.mobile-tab-bar' : '.main-nav')
    .getByRole('link', { name: /Explore/ })
    .click();
  await expect(page.getByRole('heading', { name: /Discover places with/ })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Locations on the map' })).toBeVisible();
  await expect(
    page.getByText('Choose a map pin, then discover the matching location card below.'),
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
  await search.fill('Singapore');
  await search.press('Enter');
  await expect(page.locator('#places article')).toHaveCount(1);
});

test('category selections combine, image failures collapse, and reports stay attached to their venue', async ({
  page,
}) => {
  await page.route('**/shops-webp/cards/**', (route) => route.abort());
  await page.route('**/api/v1/reports', (route) => route.abort());
  await page.goto('/en');
  const toolbar = page.locator('.search-toolbar');
  await expect(toolbar.getByRole('button', { name: 'All places', exact: true })).toHaveCount(0);
  await toolbar.getByRole('button', { name: 'Pizzerias', exact: true }).click();
  await toolbar.getByRole('button', { name: 'Bakery', exact: true }).click();
  await expect(toolbar.getByRole('button', { name: 'Pizzerias', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(toolbar.getByRole('button', { name: 'Bakery', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page).toHaveURL(/kind=pizza%2Cbakery/);
  await page.goBack();
  await expect(toolbar.getByRole('button', { name: 'Pizzerias', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(toolbar.getByRole('button', { name: 'Bakery', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.goForward();
  await expect(toolbar.getByRole('button', { name: 'Bakery', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const venue = page.locator('#venue-fico');
  await venue.scrollIntoViewIfNeeded();
  await expect(venue.locator('img[src*="shops-webp"]')).toHaveCount(0);
  await venue.getByRole('button', { name: 'Report', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('FICO', { exact: true })).toBeVisible();
  await dialog.getByLabel('Details').fill('The address needs review.');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/demo|Please try again/);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
