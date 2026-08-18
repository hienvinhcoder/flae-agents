import { expect, expectNoA11yViolations, ids, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
});

test('selects a workspace through the production adapter with scoped headers', async ({ page }) => {
  const selection = page.waitForRequest((request) =>
    request.url().endsWith('/api/v1/users/current-workspace') && request.method() === 'PUT');
  await page.goto('/dashboard/knowledge');
  await page.getByRole('button', { name: 'ET' }).click();
  const workspaceSelector = page.getByRole('combobox', { name: 'Workspace', exact: true });
  await workspaceSelector.selectOption(ids.secondWorkspace);

  const request = await selection;
  expect(request.headers().authorization).toBe('Bearer flae-e2e-token');
  expect(request.headers()['x-workspace-id']).toBe(ids.secondWorkspace);
  expect(request.postDataJSON()).toEqual({ workspace_id: ids.secondWorkspace });
  await expect(workspaceSelector).toHaveValue(ids.secondWorkspace);
});

test('invites a member and traps then restores dialog focus', async ({ page }) => {
  await page.goto('/dashboard/settings?tab=members');
  const trigger = page.getByRole('button', { name: 'Invite member' });
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Invite workspace member' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeFocused();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Send invitation' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel' }).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByLabel('Email address').fill('invitee@example.invalid');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('invitee@example.invalid')).toBeVisible();
});

test('keeps member management responsive, accessible, and live-localized', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/dashboard/settings?tab=members');

  await expect(page.getByRole('heading', { level: 1, name: 'Workspace settings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { level: 2, name: 'Members' })).toBeVisible();
  const member = page.getByRole('article', { name: 'E2E Member' });
  await expect(member).toContainText('member@example.invalid');
  await expect(member).toContainText('Active');
  const role = member.getByRole('combobox', { name: 'Role for E2E Member' });
  const remove = member.getByRole('button', { name: 'Remove E2E Member' });
  await expect(role).toBeVisible();
  await expect(remove).toBeVisible();

  for (const control of [role, remove]) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'ET' }).click();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('vi');
  await expect(page.getByRole('heading', { level: 1, name: 'Cấu hình không gian làm việc' })).toBeVisible();
  await expect(member).toContainText('Hoạt động');
  await expect(member.getByRole('combobox', { name: 'Vai trò của E2E Member' })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Xóa E2E Member' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoA11yViolations(page);
});
