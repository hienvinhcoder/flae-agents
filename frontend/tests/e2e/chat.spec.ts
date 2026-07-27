import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

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
