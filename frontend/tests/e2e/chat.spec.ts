import { expect, expectNoA11yViolations, ids, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/chat');
  await expect(page.getByRole('heading', { name: 'Research assistant', exact: true })).toBeVisible();
});

test('stops a connecting stream, retries a failure, and exposes citations', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Workspace assistant chat' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Conversation history' })).toBeVisible();
  await expect(page.getByTestId('message-viewport')).toHaveAccessibleName('Conversation messages');
  await expectNoA11yViolations(page);
  const composer = page.getByPlaceholder('Ask Research assistant...');
  await composer.fill('Stop this response');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop response' }).click();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();

  await composer.fill('Retry citation response');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('button', { name: 'Retry message' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry message' }).click();
  await expect(page.getByText('The launch plan is grounded in the product guide.')).toBeVisible();
  await page.getByRole('button', { name: 'Show 1 citation' }).click();
  await expect(page.getByRole('list', { name: 'Message citations' })).toContainText('Product guide');
});

test('keeps a long transcript inside the message viewport on desktop and mobile', async ({ api, page }) => {
  api.messages = Array.from({ length: 80 }, (_, index) => ({
    citations: [], content: `Transcript message ${index + 1}: ${'workspace context '.repeat(8)}`,
    created_at: '2026-07-24T00:00:00Z', created_by: index % 2 ? ids.agent : ids.user,
    id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    role: index % 2 ? 'assistant' : 'user', session_id: ids.session,
  }));
  await page.reload();
  const region = page.getByRole('region', { name: 'Workspace assistant chat' });
  const viewport = page.getByTestId('message-viewport');
  const composer = page.getByPlaceholder('Ask Research assistant...');

  await expect(viewport).toBeVisible();
  expect(await viewport.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await region.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await expect(composer).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await composer.scrollIntoViewIfNeeded();
  await expect(composer).toBeVisible();
  expect(await viewport.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
