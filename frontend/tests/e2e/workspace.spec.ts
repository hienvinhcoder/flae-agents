import { expect, expectNoA11yViolations, ids, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
});

test('selects a workspace through the production adapter with scoped headers', async ({ page }) => {
  const selection = page.waitForRequest((request) =>
    request.url().endsWith('/api/v1/users/current-workspace') && request.method() === 'PUT');
  await page.goto('/dashboard/briefing');
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

  const dialog = page.getByRole('dialog', { name: 'Invite member' });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Send invitation' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByLabel('Email').fill('invitee@example.invalid');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('invitee@example.invalid')).toBeVisible();
});
