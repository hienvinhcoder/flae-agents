import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null },
  app: {},
  credential: { user: { uid: 'firebase-1' } },
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../config/env', () => ({
  env: {
    VITE_FIREBASE_API_KEY: 'public-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'flae.test',
    VITE_FIREBASE_PROJECT_ID: 'flae',
    VITE_FIREBASE_STORAGE_BUCKET: 'flae.test',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender',
    VITE_FIREBASE_APP_ID: 'app',
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: firebaseMocks.initializeApp,
  getApps: firebaseMocks.getApps,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  getAuth: firebaseMocks.getAuth,
  signInWithEmailAndPassword: firebaseMocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: firebaseMocks.createUserWithEmailAndPassword,
  updateProfile: firebaseMocks.updateProfile,
  signInWithPopup: firebaseMocks.signInWithPopup,
  signOut: firebaseMocks.signOut,
}));

import {
  firebaseAuth,
  logout,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from './firebase';

describe('Firebase authentication adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.signInWithEmailAndPassword.mockResolvedValue(firebaseMocks.credential);
    firebaseMocks.createUserWithEmailAndPassword.mockResolvedValue(firebaseMocks.credential);
    firebaseMocks.signInWithPopup.mockResolvedValue(firebaseMocks.credential);
    firebaseMocks.signOut.mockResolvedValue(undefined);
  });

  it('delegates email and Google sign-in to the single configured auth instance', async () => {
    await signInWithEmail('member@example.com', 'secret-value');
    await signInWithGoogle();

    expect(firebaseMocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      firebaseAuth,
      'member@example.com',
      'secret-value',
    );
    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledWith(
      firebaseAuth,
      expect.anything(),
    );
  });

  it('updates the Firebase display name after email registration', async () => {
    await registerWithEmail('member@example.com', 'secret-value', 'Member One');

    expect(firebaseMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      firebaseAuth,
      'member@example.com',
      'secret-value',
    );
    expect(firebaseMocks.updateProfile).toHaveBeenCalledWith(firebaseMocks.credential.user, {
      displayName: 'Member One',
    });
  });

  it('signs out the configured Firebase session', async () => {
    await logout();

    expect(firebaseMocks.signOut).toHaveBeenCalledWith(firebaseAuth);
  });
});
