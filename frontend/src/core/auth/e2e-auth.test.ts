import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearE2eAuthSession,
  e2eAuthToken,
  isE2eMode,
  readE2eAuthSession,
  setE2eAuthSession,
  subscribeToE2eAuth,
} from './e2e-auth';

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('E2E auth gate', () => {
  it('stays disabled outside development even if the flag is accidentally present', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_E2E_MODE', 'true');

    setE2eAuthSession();

    expect(isE2eMode()).toBe(false);
    expect(e2eAuthToken()).toBeNull();
    expect(readE2eAuthSession()).toBeNull();
    expect(localStorage).toHaveLength(0);
  });

  it('publishes deterministic session changes only behind the development flag', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_E2E_MODE', 'true');
    const listener = vi.fn();
    const unsubscribe = subscribeToE2eAuth(listener);

    setE2eAuthSession('fixture@example.invalid', 'Fixture User');
    expect(readE2eAuthSession()).toMatchObject({
      email: 'fixture@example.invalid',
      full_name: 'Fixture User',
    });
    expect(e2eAuthToken()).toBe('flae-e2e-token');
    expect(listener).toHaveBeenCalledOnce();

    clearE2eAuthSession();
    expect(readE2eAuthSession()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
