import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

test('redirects guests, signs in locally, and returns to the protected route', async ({ page }) => {
  await page.goto('/dashboard/knowledge');
  await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fdashboard%2Fknowledge$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expectNoA11yViolations(page);

  await expect(page.getByLabel('Email')).toBeFocused();
  await page.getByLabel('Email').fill('tester@example.invalid');
  await page.getByLabel('Password').fill('deterministic-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard\/knowledge$/);
  await expect(page.getByRole('heading', { name: 'Company memory' })).toBeVisible();
});

test('restores a deterministic local session on a protected route', async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge');

  await expect(page).toHaveURL(/\/dashboard\/knowledge$/);
  await expect(page.getByRole('heading', { name: 'Company memory' })).toBeVisible();
});

test('opens Chat as the authenticated dashboard default', async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard\/chat$/);
  await expect(page.getByRole('region', { name: 'Workspace assistant chat' })).toBeVisible();
});

test('supports keyboard navigation in the dashboard shell and logs out', async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/knowledge');
  await expect(page.getByRole('heading', { name: 'Company memory' })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.getByRole('button', { name: 'ET' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('flae_e2e_auth_session'))).toBeNull();
});

test('keeps login within every required viewport', async ({ page }) => {
  const viewports = [
    { height: 812, width: 375 },
    { height: 1024, width: 768 },
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByTestId('knowledge-memory-panel')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('removes non-essential login motion for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/auth/login');

  const animationDuration = await page.getByTestId('knowledge-memory-panel').evaluate((panel) => {
    const pulse = panel.querySelector('.memory-pulse');
    return pulse ? getComputedStyle(pulse).animationDuration : '';
  });

  expect(animationDuration).toBe('0.01ms');
  await expectNoA11yViolations(page);
});
