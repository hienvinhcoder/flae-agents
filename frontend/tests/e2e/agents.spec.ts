import { expect, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/agents');
  await expect(page.getByRole('heading', { name: 'AI agents' })).toBeVisible();
});

test('creates and edits an agent through the production forms', async ({ page }) => {
  await page.getByRole('link', { name: 'Create agent' }).first().click();
  await page.getByLabel('Agent name').fill('Release assistant');
  await page.getByLabel('System prompt').fill('Answer release questions with cited workspace evidence.');
  await page.getByRole('button', { name: 'Create agent' }).click();
  await expect(page.getByRole('heading', { name: 'Release assistant' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit Release assistant' }).click();
  await page.getByLabel('Agent name').fill('Launch assistant');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Launch assistant' })).toBeVisible();
});
