import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge');
  await expect(page.getByRole('heading', { name: 'Company memory' })).toBeVisible();
});

test('renders the upload action with a visible high-contrast palette', async ({ page }) => {
  const upload = page.getByRole('button', { name: 'Upload document' });

  await expect(upload).toBeVisible();
  await expect(upload).toHaveCSS('background-color', 'rgb(194, 65, 12)');
  await expect(upload).toHaveCSS('color', 'rgb(255, 251, 245)');
  await expectNoA11yViolations(page);
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

  await productGuide.getByRole('button', { name: 'Open Product guide' }).click();
  const detailDialog = page.getByRole('dialog', { name: 'Product guide' });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(detailDialog).toBeHidden();
  await expectNoA11yViolations(page);
});
