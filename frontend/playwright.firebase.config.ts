import { defineConfig, devices } from '@playwright/test';

const emulatorRouting = process.env.VITE_USE_FIREBASE_EMULATORS ?? 'true';

export default defineConfig({
  testDir: './tests/firebase',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    env: {
      VITE_API_URL: 'http://127.0.0.1:8000/api/v1',
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:local-emulator',
      VITE_FIREBASE_AUTH_DOMAIN: 'flae-agents.firebaseapp.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      VITE_FIREBASE_PROJECT_ID: 'flae-agents',
      VITE_FIREBASE_STORAGE_BUCKET: 'flae-agents.appspot.com',
      VITE_USE_FIREBASE_EMULATORS: emulatorRouting,
      VITE_WS_URL: 'ws://127.0.0.1:8000/api/v1',
    },
    port: 4200,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
