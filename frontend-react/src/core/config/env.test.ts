import { beforeEach, describe, expect, it, vi } from 'vitest';

const validEnvironment = {
  VITE_API_URL: 'http://localhost:8000/api/v1',
  VITE_WS_URL: 'ws://localhost:8000/api/v1',
  VITE_FIREBASE_API_KEY: 'example-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:example',
} as const;

async function loadEnvironmentModule() {
  vi.resetModules();
  for (const [key, value] of Object.entries(validEnvironment)) {
    vi.stubEnv(key, value);
  }

  return import('./env');
}

describe('parseEnv', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses a complete valid environment', async () => {
    const { env, parseEnv } = await loadEnvironmentModule();

    expect(parseEnv(validEnvironment)).toEqual(validEnvironment);
    expect(env).toEqual(validEnvironment);
  });

  it('lists missing keys without exposing supplied secret values', async () => {
    const { parseEnv } = await loadEnvironmentModule();
    const secret = 'super-secret-firebase-key';
    const source = { ...validEnvironment, VITE_FIREBASE_API_KEY: secret };
    delete (source as Partial<typeof source>).VITE_FIREBASE_PROJECT_ID;

    expect(() => parseEnv(source)).toThrow(/VITE_FIREBASE_PROJECT_ID/);
    expect(() => parseEnv(source)).not.toThrow(secret);
  });

  it('identifies invalid URL keys', async () => {
    const { parseEnv } = await loadEnvironmentModule();

    expect(() => parseEnv({ ...validEnvironment, VITE_API_URL: 'not a url' })).toThrow(
      /VITE_API_URL/,
    );
  });

  it('accepts secure HTTP and WebSocket protocols', async () => {
    const { parseEnv } = await loadEnvironmentModule();

    expect(
      parseEnv({
        ...validEnvironment,
        VITE_API_URL: 'https://api.example.test/v1',
        VITE_WS_URL: 'wss://api.example.test/v1',
      }),
    ).toMatchObject({
      VITE_API_URL: 'https://api.example.test/v1',
      VITE_WS_URL: 'wss://api.example.test/v1',
    });
  });

  it.each([
    ['VITE_API_URL', 'ftp://api.example.test/v1'],
    ['VITE_API_URL', 'mailto:admin@example.test'],
    ['VITE_WS_URL', 'https://api.example.test/v1'],
    ['VITE_WS_URL', 'ftp://api.example.test/v1'],
    ['VITE_WS_URL', 'mailto:admin@example.test'],
  ] as const)('rejects an unsupported protocol for %s', async (key, value) => {
    const { parseEnv } = await loadEnvironmentModule();

    expect(() => parseEnv({ ...validEnvironment, [key]: value })).toThrow(new RegExp(key));
  });

  it('returns an immutable environment and never leaks an invalid secret', async () => {
    const { parseEnv } = await loadEnvironmentModule();
    const parsed = parseEnv(validEnvironment);

    expect(Object.isFrozen(parsed)).toBe(true);
    expect(() => {
      (parsed as { VITE_API_URL: string }).VITE_API_URL = 'https://changed.example';
    }).toThrow();

    const secret = 'do-not-print-this-secret';
    expect(() =>
      parseEnv({ ...validEnvironment, VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_APP_ID: secret }),
    ).not.toThrow(secret);
  });
});
