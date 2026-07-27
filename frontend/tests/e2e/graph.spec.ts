import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge/graph');
  await expect(page.getByRole('heading', { name: 'Knowledge graph' })).toBeVisible();
  await expect(page.getByText('2 visible nodes / 1 visible edges')).toBeVisible();
});

test('filters, selects, and navigates the graph with accessible controls', async ({ page }) => {
  await expect(page.getByRole('toolbar', { name: 'Graph tools' })).toBeVisible();
  await expect(page.locator('canvas[aria-label="Knowledge graph"]')).toBeVisible();
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomInBox = await zoomIn.boundingBox();
  expect(zoomInBox?.height).toBeGreaterThanOrEqual(44);
  expect(zoomInBox?.width).toBeGreaterThanOrEqual(44);
  await expectNoA11yViolations(page);
  await page.getByLabel('Search entities').fill('FLAE');
  await page.getByRole('option', { name: 'FLAE platform product' }).click();
  await expect(page.getByLabel('Entity details')).toContainText('FLAE platform');

  await page.getByLabel('Entity type').selectOption('team');
  await expect(page.getByLabel('Entity details')).toBeHidden();
  await expect(page.getByText('1 visible nodes / 0 visible edges')).toBeVisible();
  await page.getByRole('button', { name: 'Fit graph' }).click();
  await page.getByRole('link', { name: 'Back to knowledge base' }).click();
  await expect(page).toHaveURL(/\/dashboard\/knowledge$/);
});

test('fills a tall dashboard viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1440 });

  const graphSurface = page.locator('canvas[aria-label="Knowledge graph"]').locator('..');
  const surfaceBox = await graphSurface.boundingBox();
  expect(surfaceBox?.height).toBeGreaterThanOrEqual(700);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('keeps the mobile inspector within the graph and supports keyboard suggestions', async ({ page }) => {
  await page.setViewportSize({ height: 812, width: 375 });

  await page.getByLabel('Search entities').fill('FLAE');
  const suggestion = page.getByRole('option', { name: 'FLAE platform product' });
  await suggestion.focus();
  await expect(suggestion).toBeFocused();
  await suggestion.press('Enter');

  const graphSurface = page.locator('canvas[aria-label="Knowledge graph"]').locator('..');
  const inspector = page.getByLabel('Entity details');
  await expect(inspector).toContainText('FLAE platform');
  const surfaceBox = await graphSurface.boundingBox();
  const inspectorBox = await inspector.boundingBox();
  expect(surfaceBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  expect(inspectorBox!.x).toBeGreaterThanOrEqual(surfaceBox!.x);
  expect(inspectorBox!.x + inspectorBox!.width).toBeLessThanOrEqual(
    surfaceBox!.x + surfaceBox!.width,
  );
  expect(inspectorBox!.y + inspectorBox!.height).toBeLessThanOrEqual(
    surfaceBox!.y + surfaceBox!.height,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
