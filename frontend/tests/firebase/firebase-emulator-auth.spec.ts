import { expect, test } from '@playwright/test';

test('signs in through Auth Emulator and synchronizes with the backend', async ({
  page,
  request,
}) => {
  const email = `browser-${Date.now()}@example.com`;
  const password = 'emulator-password-123';
  const signup = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    { data: { email, password, returnSecureToken: true } },
  );
  expect(signup.ok(), await signup.text()).toBe(true);

  const firebaseRequests: URL[] = [];
  page.on('request', (outgoing) => {
    if (/identitytoolkit|9099/.test(outgoing.url())) {
      firebaseRequests.push(new URL(outgoing.url()));
    }
  });

  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard\/chat$/);
  expect(firebaseRequests.some((url) => url.host === '127.0.0.1:9099')).toBe(true);
  expect(
    firebaseRequests.some((url) => url.host === 'identitytoolkit.googleapis.com'),
  ).toBe(false);
});
