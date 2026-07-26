import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateBuildEnvironment } from './vite.config';

const validEnvironment = {
  VITE_API_URL: 'https://api.example.test/v1',
  VITE_WS_URL: 'wss://api.example.test/v1',
  VITE_FIREBASE_API_KEY: 'example-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:example',
} as const;

describe('validateBuildEnvironment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('validates Vite build values through the shared environment schema', () => {
    for (const [key, value] of Object.entries(validEnvironment)) {
      vi.stubEnv(key, value);
    }
    vi.stubEnv('VITE_API_URL', 'ftp://api.example.test/v1');

    expect(() =>
      validateBuildEnvironment(
        { command: 'build', mode: 'test', isSsrBuild: false, isPreview: false },
        process.cwd(),
      ),
    ).toThrow(/VITE_API_URL/);
  });
});
