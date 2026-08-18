import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  app: {},
  auth: {},
  storage: {},
  useEmulators: false,
  getApps: vi.fn(() => [firebaseMocks.app]),
  getAuth: vi.fn(() => firebaseMocks.auth),
  getStorage: vi.fn(() => firebaseMocks.storage),
  connectAuthEmulator: vi.fn(),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('../config/env', () => ({
  env: {
    VITE_FIREBASE_API_KEY: 'public-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'flae.test',
    VITE_FIREBASE_PROJECT_ID: 'flae-agents',
    VITE_FIREBASE_STORAGE_BUCKET: 'flae-agents.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender',
    VITE_FIREBASE_APP_ID: 'app',
    get VITE_USE_FIREBASE_EMULATORS() {
      return firebaseMocks.useEmulators;
    },
  },
}));

vi.mock('firebase/app', () => ({
  getApps: firebaseMocks.getApps,
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  getAuth: firebaseMocks.getAuth,
  connectAuthEmulator: firebaseMocks.connectAuthEmulator,
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: firebaseMocks.getStorage,
  connectStorageEmulator: firebaseMocks.connectStorageEmulator,
}));

describe('Firebase emulator routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.auth = {};
    firebaseMocks.storage = {};
    firebaseMocks.useEmulators = false;
  });

  it('does not connect SDKs when emulator routing is disabled', async () => {
    vi.resetModules();

    await import('./firebase');

    expect(firebaseMocks.connectAuthEmulator).not.toHaveBeenCalled();
    expect(firebaseMocks.connectStorageEmulator).not.toHaveBeenCalled();
  });

  it('connects each SDK once across repeated module initialization', async () => {
    firebaseMocks.useEmulators = true;
    vi.resetModules();
    await import('./firebase');
    vi.resetModules();

    await import('./firebase');

    expect(firebaseMocks.connectAuthEmulator).toHaveBeenCalledOnce();
    expect(firebaseMocks.connectAuthEmulator).toHaveBeenCalledWith(
      firebaseMocks.auth,
      'http://127.0.0.1:9099',
    );
    expect(firebaseMocks.connectStorageEmulator).toHaveBeenCalledOnce();
    expect(firebaseMocks.connectStorageEmulator).toHaveBeenCalledWith(
      firebaseMocks.storage,
      '127.0.0.1',
      9199,
    );
  });
});
