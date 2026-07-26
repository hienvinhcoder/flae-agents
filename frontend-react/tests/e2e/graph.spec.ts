import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge/graph');
  await expect(page.getByRole('heading', { name: 'Knowledge graph' })).toBeVisible();
  await expect(page.getByText('2 visible nodes / 1 visible edges')).toBeVisible();
});

test('filters, selects, and navigates the graph with accessible controls', async ({ page }) => {
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
