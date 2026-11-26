import { publishedRestaurants } from '../../src/data/restaurants';
import { parseQuery, filterRestaurants } from '../../src/services/discovery';
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
    .getByRole('link', { name: 'FICO', exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/restaurants\/fico$/, { timeout: 30000 });
  await expect(page.getByRole('heading', { level: 1, name: 'FICO' })).toBeVisible({
    timeout: 15000,
  });
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
  await page.route('**/shops-webp/cards/**', (route) => route.fulfill({ status: 404, body: '' }));
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
  await expect(venue.getByRole('button', { name: 'Report', exact: true })).toHaveCount(0);
  await venue.getByRole('link', { name: 'FICO', exact: true }).click();
  const actions = page.locator('.venue-actions');
  const report = actions.getByRole('button', { name: 'Report', exact: true });
  const share = actions.getByRole('button', { name: 'Share', exact: true });
  await expect(report).toBeVisible();
  await expect(share).toBeVisible();
  const reportBox = await report.boundingBox();
  const shareBox = await share.boundingBox();
  expect(reportBox!.x + reportBox!.width).toBeLessThanOrEqual(shareBox!.x);
  await report.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('FICO', { exact: true })).toBeVisible();
  await dialog.getByLabel('Details').fill('The address needs review.');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog.getByRole('alert')).toContainText(/demo|Please try again/);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('mobile discovery filters and popup stay inside their containers', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  test.setTimeout(60000);
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/it');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    for (const selector of ['.search-toolbar > .filter-pills', '.location-filters']) {
      const row = page.locator(selector);
      await expect(row.getByRole('button')).toHaveCount(5);
      const fits = await row.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll('button')].every((button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.left >= bounds.left - 1 &&
            rect.right <= bounds.right + 1 &&
            rect.top >= bounds.top - 1 &&
            rect.bottom <= bounds.bottom + 1
          );
        });
      });
      expect(fits, `${selector} at ${width}px`).toBe(true);
    }
    await expect(page.locator('.map-zoom-hint')).toBeHidden();
    await expect(page.locator('.map-label')).toHaveCount(0);
    await page.locator('.moretti-map-marker').click();
    const popup = page.locator('.leaflet-popup');
    await expect(popup).toBeVisible();
    await expect(page.locator('.map-label')).toBeHidden();
    await expect
      .poll(async () => {
        const popupBounds = await popup.boundingBox();
        const mapBounds = await page.locator('.map-frame').boundingBox();
        return Boolean(
          popupBounds &&
          mapBounds &&
          popupBounds.x >= mapBounds.x &&
          popupBounds.x + popupBounds.width <= mapBounds.x + mapBounds.width &&
          popupBounds.y >= mapBounds.y &&
          popupBounds.y + popupBounds.height <= mapBounds.y + mapBounds.height,
        );
      })
      .toBe(true);
    await page.locator('.leaflet-popup-content').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(popup.getByRole('link', { name: 'Indicazioni' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`mobile-map-${width}.png`) });
    await popup.getByRole('button', { name: 'Close popup' }).click();
    await expect(popup).not.toBeVisible();
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/it?city=Roma');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  const pins = page.locator('.leaflet-overlay-pane path.leaflet-interactive');
  for (let step = 0; step < 5 && (await pins.count()) === 0; step++) {
    await page.locator('.venue-cluster').first().click();
  }
  await expect(pins.first()).toBeVisible();
  await pins.first().click();
  const venuePopup = page.locator('.leaflet-popup');
  await expect(venuePopup.getByRole('link', { name: 'Scopri il locale' })).toBeVisible();
  await page.locator('.leaflet-popup-content').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(async () => {
      const venueBounds = await venuePopup.boundingBox();
      const frameBounds = await page.locator('.map-frame').boundingBox();
      return Boolean(
        venueBounds &&
        frameBounds &&
        venueBounds.x >= frameBounds.x &&
        venueBounds.x + venueBounds.width <= frameBounds.x + frameBounds.width,
      );
    })
    .toBe(true);
  const linkColor = await venuePopup
    .getByRole('link', { name: 'Scopri il locale' })
    .evaluate((element) => getComputedStyle(element).color);
  expect(['rgb(248, 244, 235)', 'rgb(255, 254, 251)']).toContain(linkColor);
  await page.screenshot({ path: testInfo.outputPath('mobile-venue-popup.png') });
  await venuePopup.getByRole('button', { name: 'Close popup' }).click();
  await expect(page.locator('.footer-message')).toHaveCount(0);
});

test('mobile footer is compact and floating shop action opens registration', async ({
  page,
}, testInfo) => {
  await page.goto('/it');
  const floating = page.locator('.listing-request-floating');
  await expect(page.locator('.footer-message')).toHaveCount(0);
  if (testInfo.project.name !== 'mobile') {
    await expect(floating).toBeHidden();
    return;
  }
  await expect(floating).toBeVisible();
  await expect(floating).toHaveAccessibleName('Iscrivi il tuo locale');
  const button = await floating.boundingBox();
  const tabs = await page.locator('.mobile-tab-bar').boundingBox();
  expect(button && tabs && button.y + button.height < tabs.y).toBeTruthy();
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.footer-actions .listing-request-footer')).toBeHidden();
  const viewport = page.viewportSize()!;
  await page.screenshot({
    path: testInfo.outputPath('mobile-footer-floating.png'),
    clip: { x: 0, y: viewport.height - 280, width: viewport.width, height: 280 },
    style: 'nextjs-portal { visibility: hidden; }',
  });
  await floating.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('map searches automatically after zoom and drag without popup or history side effects', async ({
  page,
}, testInfo) => {
  await page.goto('/it');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page
    .locator('.search-toolbar')
    .getByRole('button', { name: 'Pizzerie', exact: true })
    .click();
  const historyLength = await page.evaluate(() => history.length);
  await expect(page.locator('.map-search')).toHaveCount(0);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('bounds')).not.toBeNull();
  const zoomBounds = new URL(page.url()).searchParams.get('bounds');
  expect(new URL(page.url()).searchParams.get('kind')).toBe('pizza');
  const expected = filterRestaurants(
    publishedRestaurants,
    parseQuery(new URL(page.url()).searchParams),
  );
  await expect(page.locator('#places article')).toHaveCount(expected.length);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.locator('.moretti-map-marker').click();
  await expect(page.locator('.leaflet-popup')).toBeVisible();
  // Wait beyond the debounce interval: popup auto-panning must not trigger a search.
  await page.waitForTimeout(800);
  expect(new URL(page.url()).searchParams.get('bounds')).toBe(zoomBounds);
  await page.locator('.leaflet-popup').getByRole('button', { name: 'Close popup' }).click();
  await expect(page.locator('.leaflet-popup')).toHaveCount(0);
  await page.locator('.leaflet-container').scrollIntoViewIfNeeded();
  const box = (await page.locator('.leaflet-container').boundingBox())!;
  if (testInfo.project.name === 'mobile') {
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + 80, y: box.y + box.height / 2 }],
    });
    for (let step = 1; step <= 12; step++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box.x + 80 + step * 7, y: box.y + box.height / 2 }],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(box.x + 80, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await expect.poll(() => new URL(page.url()).searchParams.get('bounds')).not.toBe(zoomBounds);
  const afterDrag = filterRestaurants(
    publishedRestaurants,
    parseQuery(new URL(page.url()).searchParams),
  );
  await expect(page.locator('#places article')).toHaveCount(afterDrag.length);
  expect(new URL(page.url()).searchParams.get('kind')).toBe('pizza');
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  const keyboardArea = new URL(page.url()).searchParams.get('bounds');
  await page.locator('.leaflet-container').focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => new URL(page.url()).searchParams.get('bounds')).not.toBe(keyboardArea);
  const area = new URL(page.url()).searchParams.get('bounds');
  await page
    .locator('.search-toolbar')
    .getByRole('button', { name: 'Bakery', exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get('bounds')).toBe(area);
  const combined = filterRestaurants(
    publishedRestaurants,
    parseQuery(new URL(page.url()).searchParams),
  );
  await expect(page.locator('#places article')).toHaveCount(combined.length);
});

test('search and category removal stay synchronized between map controls and venue list', async ({
  page,
}) => {
  await page.goto('/it?city=Roma&kind=pizza&bounds=41,12,43,13');
  const search = page.getByRole('textbox', { name: 'Trova un locale o una città' });
  await expect(search).toHaveValue('Roma');
  await page.getByRole('button', { name: 'Cancella la ricerca: Roma', exact: true }).click();
  await expect(search).toHaveValue('');
  expect(new URL(page.url()).searchParams.has('city')).toBe(false);
  expect(new URL(page.url()).searchParams.has('bounds')).toBe(false);
  expect(new URL(page.url()).searchParams.get('kind')).toBe('pizza');
  await expect(page.locator('#places article')).toHaveCount(
    filterRestaurants(publishedRestaurants, parseQuery(new URL(page.url()).searchParams)).length,
  );
  await search.fill('Roma');
  await page.getByRole('option', { name: /^Roma/ }).first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get('city')).toBe('Roma');
  await search.fill('');
  await expect(page.locator('.applied-filters')).not.toContainText('Roma');
  expect(new URL(page.url()).searchParams.has('city')).toBe(false);
  await page
    .locator('.location-filters')
    .getByRole('button', { name: 'Pizzerie', exact: true })
    .click();
  await expect(
    page.locator('.search-toolbar').getByRole('button', { name: 'Pizzerie', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#places article')).toHaveCount(publishedRestaurants.length);
  await search.fill('FICO');
  await search.press('Enter');
  await expect(page.locator('#places article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Cancella la ricerca', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('#places article')).toHaveCount(publishedRestaurants.length);
});

test('registration consent checkboxes are required and unchecked in both languages', async ({
  page,
}) => {
  for (const locale of ['it', 'en']) {
    await page.goto(`/${locale}`);
    await page
      .getByRole('button', {
        name: locale === 'it' ? 'Iscrivi il tuo locale' : 'List your place',
        exact: true,
      })
      .first()
      .click();
    const modal = page.getByRole('dialog');
    const notice = modal.getByRole('link', {
      name: locale === 'it' ? 'Leggi l’informativa (PDF)' : 'Read the privacy notice (PDF)',
    });
    await expect(notice).toHaveAttribute(
      'href',
      new RegExp(`/informativa-roadtosmartbaking-${locale}-[a-f0-9]{12}\\.pdf$`),
    );
    await expect(notice).toHaveAttribute('target', '_blank');
    await expect(notice).toHaveAttribute('rel', 'noopener noreferrer');
    const consents = modal.locator('input[type="checkbox"]');
    await expect(consents).toHaveCount(2);
    for (const checkbox of await consents.all()) {
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toHaveAttribute('required', '');
      expect(await checkbox.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(
        false,
      );
      await checkbox.check();
      expect(await checkbox.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(
        true,
      );
    }
    const group = modal.locator('.listing-consents');
    await expect(group).toContainText(
      locale === 'it' ? 'Adesione al servizio' : 'Service membership',
    );
    await expect(group).toContainText('Moretti Forni S.p.A.');
    expect(await group.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  }
});
