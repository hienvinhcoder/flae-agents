import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge');
  await expect(page.getByRole('heading', { name: 'Knowledge base' })).toBeVisible();
});

test('uploads, retries, and deletes knowledge through route components', async ({ page }) => {
  const table = page.getByRole('table', { name: 'Knowledge documents' });
  await expect(table).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Upload document' }).click();
  await page.getByLabel('Document file').setInputFiles({
    buffer: Buffer.from('# E2E handbook'),
    mimeType: 'text/markdown',
    name: 'handbook.md',
  });
  await page.getByLabel('Document title').fill('Uploaded handbook');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(table.getByText('Uploaded handbook')).toBeVisible();

  await table.getByRole('button', { name: 'Retry Failed import' }).click();
  await expect(table.getByRole('button', { name: /Retry Failed import/ })).toBeHidden();

  page.once('dialog', (dialog) => dialog.accept());
  await table.getByRole('button', { name: 'Delete Product guide' }).click();
  await expect(table.getByText('Product guide')).toBeHidden();
});

test('renders document summaries on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });

  const productGuide = page.getByRole('article', { name: 'Product guide' });
  await expect(productGuide).toBeVisible();
  await expect(productGuide).toContainText('Completed');
  await expect(productGuide).toContainText('4 chunks');
  await expectNoA11yViolations(page);
});
