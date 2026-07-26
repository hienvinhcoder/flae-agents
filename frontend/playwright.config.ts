import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    env: {
      VITE_API_URL: 'http://127.0.0.1:8000/api/v1',
      VITE_E2E_MODE: 'true',
      VITE_FIREBASE_API_KEY: 'e2e-api-key',
      VITE_FIREBASE_APP_ID: '1:123456789:web:e2e',
      VITE_FIREBASE_AUTH_DOMAIN: 'e2e.invalid',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      VITE_FIREBASE_PROJECT_ID: 'flae-e2e',
      VITE_FIREBASE_STORAGE_BUCKET: 'flae-e2e.invalid',
      VITE_WS_URL: 'ws://127.0.0.1:8000',
    },
    port: 4200,
    reuseExistingServer: !isCi,
  },
});
