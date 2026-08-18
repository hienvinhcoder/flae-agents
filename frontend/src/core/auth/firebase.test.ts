import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  app: {},
  credential: { user: { uid: 'firebase-1' } },
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getAuth: vi.fn(() => firebaseMocks.auth),
  getStorage: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  connectStorageEmulator: vi.fn(),
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
    VITE_USE_FIREBASE_EMULATORS: false,
  },
}));

vi.mock('firebase/app', () => ({
  initializeApp: firebaseMocks.initializeApp,
  getApps: firebaseMocks.getApps,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  getAuth: firebaseMocks.getAuth,
  connectAuthEmulator: firebaseMocks.connectAuthEmulator,
  signInWithEmailAndPassword: firebaseMocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: firebaseMocks.createUserWithEmailAndPassword,
  updateProfile: firebaseMocks.updateProfile,
  signInWithPopup: firebaseMocks.signInWithPopup,
  signOut: firebaseMocks.signOut,
}));

vi.mock('firebase/storage', () => ({
  getStorage: firebaseMocks.getStorage,
  connectStorageEmulator: firebaseMocks.connectStorageEmulator,
}));

import {
  firebaseAuth,
  logout,
  logoutIfCurrentUser,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from './firebase';
import { consumeRegistrationMetadata } from './registration-coordinator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

describe('Firebase authentication adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.auth.currentUser = null;
    firebaseMocks.signInWithEmailAndPassword.mockResolvedValue(firebaseMocks.credential);
    firebaseMocks.createUserWithEmailAndPassword.mockImplementation(() => {
      firebaseMocks.auth.currentUser = firebaseMocks.credential.user;
      return Promise.resolve(firebaseMocks.credential);
    });
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

  it('publishes registration metadata before createUser and only releases it after profile update', async () => {
    const profileUpdate = deferred<void>();
    let metadata: ReturnType<typeof consumeRegistrationMetadata> | undefined;
    firebaseMocks.createUserWithEmailAndPassword.mockImplementation(() => {
      firebaseMocks.auth.currentUser = firebaseMocks.credential.user;
      metadata = consumeRegistrationMetadata('member@example.com');
      return Promise.resolve(firebaseMocks.credential);
    });
    firebaseMocks.updateProfile.mockReturnValue(profileUpdate.promise);

    const registration = registerWithEmail(
      'member@example.com',
      'secret-value',
      'Member One',
    );
    await Promise.resolve();
    expect(metadata).toBeDefined();
    let metadataSettled = false;
    void metadata?.finally(() => {
      metadataSettled = true;
    });
    await Promise.resolve();
    expect(metadataSettled).toBe(false);

    profileUpdate.resolve();

    await expect(registration).resolves.toEqual(firebaseMocks.credential);
    await expect(metadata).resolves.toEqual({ fullName: 'Member One' });
  });

  it('rolls back Firebase auth and blocks metadata consumption when profile update fails', async () => {
    let metadata: ReturnType<typeof consumeRegistrationMetadata> | undefined;
    firebaseMocks.createUserWithEmailAndPassword.mockImplementation(() => {
      firebaseMocks.auth.currentUser = firebaseMocks.credential.user;
      metadata = consumeRegistrationMetadata('member@example.com');
      return Promise.resolve(firebaseMocks.credential);
    });
    firebaseMocks.updateProfile.mockRejectedValue(
      new Error('member@example.com profile update included firebase-token'),
    );

    const registration = registerWithEmail(
      'member@example.com',
      'secret-value',
      'Member One',
    );

    await expect(registration).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
    });
    await expect(metadata).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
    });
    expect(firebaseMocks.signOut).toHaveBeenCalledWith(firebaseAuth);
  });

  it('does not roll back a newer Firebase user when the previous profile update fails late', async () => {
    const profileUpdate = deferred<void>();
    firebaseMocks.auth.currentUser = firebaseMocks.credential.user;
    firebaseMocks.updateProfile.mockReturnValue(profileUpdate.promise);

    const registration = registerWithEmail(
      'member@example.com',
      'secret-value',
      'Member One',
    );
    await Promise.resolve();

    const newerUser = { uid: 'firebase-2' };
    firebaseMocks.auth.currentUser = newerUser;
    profileUpdate.reject(new Error('profile update failed'));

    await expect(registration).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
    });
    expect(firebaseMocks.auth.currentUser).toBe(newerUser);
    expect(firebaseMocks.signOut).not.toHaveBeenCalled();
  });

  it('signs out the configured Firebase session', async () => {
    await logout();

    expect(firebaseMocks.signOut).toHaveBeenCalledWith(firebaseAuth);
  });

  it('only signs out when the expected Firebase user is still current', async () => {
    firebaseMocks.auth.currentUser = { uid: 'firebase-2' };

    await logoutIfCurrentUser('firebase-1');
    expect(firebaseMocks.signOut).not.toHaveBeenCalled();

    await logoutIfCurrentUser('firebase-2');
    expect(firebaseMocks.signOut).toHaveBeenCalledOnce();
    expect(firebaseMocks.signOut).toHaveBeenCalledWith(firebaseAuth);
  });
});
