import { expect, ids, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/topics');
  await expect(page.getByRole('heading', { name: 'Knowledge topics' })).toBeVisible();
});

test('merges a duplicate topic and archives the retained topic', async ({ page }) => {
  await page.getByRole('button', { name: 'Merge topics' }).click();
  await page.getByLabel('Target topic').selectOption(ids.topic);
  await page.getByRole('checkbox', { name: 'Market research' }).check();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Merge duplicate topics' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Market research' })).toBeHidden();

  await page.getByRole('heading', { name: 'Product strategy' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Topic status').selectOption('archived');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByLabel('Topic metadata')).toContainText('Archived');
});
