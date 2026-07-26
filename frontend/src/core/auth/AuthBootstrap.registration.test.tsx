import { act, render, screen, waitFor } from '@testing-library/react';
import type { User as FirebaseUser } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '../stores/auth-store';

const firebaseMocks = vi.hoisted(() => ({
  auth: {
    currentUser: null as FirebaseUser | null,
    authStateReady: vi.fn<() => Promise<void>>(),
  },
  getRedirectResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
  syncUser: vi.fn(),
  logout: vi.fn(),
  logoutIfCurrentUser: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn() }),
}));

vi.mock('./firebase', () => ({
  firebaseAuth: firebaseMocks.auth,
  logout: firebaseMocks.logout,
  logoutIfCurrentUser: firebaseMocks.logoutIfCurrentUser,
}));

vi.mock('firebase/auth', () => ({
  getRedirectResult: firebaseMocks.getRedirectResult,
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
}));

vi.mock('../../features/auth/api/auth-api', () => ({ syncUser: firebaseMocks.syncUser }));

import { AuthBootstrap } from './AuthBootstrap';
import { beginRegistrationMetadata } from './registration-coordinator';
import { useAuthStore } from '../stores/auth-store';

const databaseUser: User = {
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'member@example.com',
  full_name: 'Member One',
  avatar_url: null,
  is_active: true,
  login_providers: ['email_password'],
  current_workspace_id: null,
};

function firebaseUser(overrides: Partial<FirebaseUser> = {}) {
  return {
    uid: 'firebase-1',
    email: 'member@example.com',
    displayName: 'Member One',
    photoURL: null,
    providerData: [{ providerId: 'password' }],
    getIdToken: vi.fn().mockResolvedValue('firebase-token'),
    ...overrides,
  } as unknown as FirebaseUser;
}

function AuthStateProbe() {
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  return <><output aria-label="auth status">{status}</output><output aria-label="auth error">{error ?? 'none'}</output></>;
}

describe('AuthBootstrap registration coordination', () => {
  let authStateListener: ((user: FirebaseUser | null) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateListener = undefined;
    firebaseMocks.auth.currentUser = null;
    firebaseMocks.auth.authStateReady.mockResolvedValue();
    firebaseMocks.getRedirectResult.mockResolvedValue(null);
    firebaseMocks.logout.mockImplementation(() => {
      firebaseMocks.auth.currentUser = null;
      return Promise.resolve();
    });
    firebaseMocks.logoutIfCurrentUser.mockImplementation(async (expectedUid: string) => {
      if (firebaseMocks.auth.currentUser?.uid === expectedUid) await firebaseMocks.logout();
    });
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, listener: (user: FirebaseUser | null) => void) => {
        authStateListener = listener;
        return vi.fn();
      },
    );
    useAuthStore.getState().resetForBootstrap();
  });

  it('waits for committed registration metadata before syncing the new Firebase user', async () => {
    render(<AuthBootstrap><AuthStateProbe /></AuthBootstrap>);
    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous'));

    const registration = beginRegistrationMetadata('member@example.com', 'Requested Name');
    const registeredUser = firebaseUser({ displayName: null });
    firebaseMocks.auth.currentUser = registeredUser;
    firebaseMocks.syncUser.mockResolvedValue({ ...databaseUser, full_name: 'Requested Name' });

    act(() => authStateListener?.(registeredUser));
    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('syncing'));
    expect(firebaseMocks.syncUser).not.toHaveBeenCalled();

    registration.complete();

    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('authenticated'));
    expect(firebaseMocks.syncUser).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Requested Name', login_provider: 'email_password' }),
      'firebase-1',
      'firebase-token',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('never syncs partial backend state when registration metadata setup fails', async () => {
    render(<AuthBootstrap><AuthStateProbe /></AuthBootstrap>);
    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous'));

    const registration = beginRegistrationMetadata('member@example.com', 'Requested Name');
    const registeredUser = firebaseUser({ displayName: null });
    firebaseMocks.auth.currentUser = registeredUser;
    act(() => authStateListener?.(registeredUser));
    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('syncing'));

    registration.fail();

    await waitFor(() => expect(firebaseMocks.logout).toHaveBeenCalledOnce());
    expect(firebaseMocks.syncUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous');
    expect(screen.getByLabelText('auth error')).toHaveTextContent('Unable to finish signing in. Please try again.');
  });
});
