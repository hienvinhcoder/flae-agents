import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test('redirects guests, signs in locally, and returns to the protected route', async ({ page }) => {
  await page.goto('/dashboard/knowledge');
  await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fdashboard%2Fknowledge$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.getByLabel('Email').fill('tester@example.invalid');
  await page.getByLabel('Password').fill('deterministic-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard\/knowledge$/);
  await expect(page.getByRole('heading', { name: 'Knowledge base' })).toBeVisible();
});

test('restores a deterministic local session on a protected route', async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/briefing');

  await expect(page).toHaveURL(/\/dashboard\/briefing$/);
  await expect(page.getByRole('heading', { name: /briefing/i })).toBeVisible();
});

test('supports keyboard navigation in the dashboard shell and logs out', async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/briefing');
  await expect(page.getByRole('heading', { name: 'Morning briefing' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('flae_e2e_auth_session'))).toBeNull();
});
