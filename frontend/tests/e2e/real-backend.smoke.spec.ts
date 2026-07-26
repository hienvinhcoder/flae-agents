import { expect, test } from '@playwright/test';

const backendUrl = process.env.E2E_REAL_BACKEND_URL;

test.describe('real backend smoke', () => {
  test.skip(!backendUrl, 'Set E2E_REAL_BACKEND_URL to run the optional real-backend smoke suite.');

  test('reports a healthy backend without requiring an account', async ({ request }) => {
    const response = await request.get(`${backendUrl?.replace(/\/$/, '')}/health`);
    expect(response.ok()).toBe(true);
  });
});
