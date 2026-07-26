import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge');
  await expect(page.getByRole('heading', { name: 'Knowledge base' })).toBeVisible();
});

test('uploads, retries, and deletes knowledge through route components', async ({ page }) => {
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Upload document' }).click();
  await page.getByLabel('Document file').setInputFiles({
    buffer: Buffer.from('# E2E handbook'),
    mimeType: 'text/markdown',
    name: 'handbook.md',
  });
  await page.getByLabel('Document title').fill('Uploaded handbook');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Uploaded handbook')).toBeVisible();

  await page.getByRole('button', { name: 'Retry Failed import' }).click();
  await expect(page.getByRole('button', { name: /Retry Failed import/ })).toBeHidden();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Product guide' }).click();
  await expect(page.getByText('Product guide')).toBeHidden();
});
