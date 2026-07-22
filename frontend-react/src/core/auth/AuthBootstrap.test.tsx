import { act, render, screen, waitFor } from '@testing-library/react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { PropsWithChildren } from 'react';
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
  clearQueryCache: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: firebaseMocks.clearQueryCache }),
}));

vi.mock('./firebase', () => ({
  firebaseAuth: firebaseMocks.auth,
}));

vi.mock('firebase/auth', () => ({
  getRedirectResult: firebaseMocks.getRedirectResult,
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
}));

vi.mock('../../features/auth/api/auth-api', () => ({
  syncUser: firebaseMocks.syncUser,
}));

import { AuthBootstrap } from './AuthBootstrap';
import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';

const databaseUser: User = {
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'member@example.com',
  full_name: 'Member One',
  avatar_url: null,
  is_active: true,
  login_providers: ['google'],
  current_workspace_id: null,
};

function firebaseUser(overrides: Partial<FirebaseUser> = {}) {
  return {
    uid: 'firebase-1',
    email: 'member@example.com',
    displayName: 'Member One',
    photoURL: null,
    providerData: [{ providerId: 'google.com' }],
    getIdToken: vi.fn().mockResolvedValue('firebase-token'),
    ...overrides,
  } as unknown as FirebaseUser;
}

function AuthStateProbe({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);

  return (
    <div>
      <output aria-label="auth status">{status}</output>
      <output aria-label="auth user">{user?.firebase_uid ?? 'none'}</output>
      <output aria-label="auth error">{error ?? 'none'}</output>
      {children}
    </div>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('AuthBootstrap', () => {
  let authStateListener: ((user: FirebaseUser | null) => void) | undefined;
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authStateListener = undefined;
    firebaseMocks.auth.currentUser = null;
    firebaseMocks.auth.authStateReady.mockResolvedValue();
    firebaseMocks.getRedirectResult.mockResolvedValue(null);
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, listener: (user: FirebaseUser | null) => void) => {
        authStateListener = listener;
        return unsubscribe;
      },
    );
    useAuthStore.getState().resetForBootstrap();
    useWorkspaceStore.getState().reset();
  });

  it('waits for redirect handling and Firebase readiness before exposing an anonymous session', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');
    const { unmount } = render(
      <AuthBootstrap>
        <AuthStateProbe>application</AuthStateProbe>
      </AuthBootstrap>,
    );

    expect(screen.getByLabelText('auth status')).toHaveTextContent('initializing');
    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous'),
    );

    expect(firebaseMocks.getRedirectResult).toHaveBeenCalledOnce();
    expect(firebaseMocks.auth.authStateReady).toHaveBeenCalledOnce();
    expect(firebaseMocks.getRedirectResult.mock.invocationCallOrder[0]).toBeLessThan(
      firebaseMocks.auth.authStateReady.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(firebaseMocks.onAuthStateChanged).toHaveBeenCalledOnce();
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('current_workspace_id')).toBeNull();
    expect(firebaseMocks.clearQueryCache).toHaveBeenCalledOnce();

    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('restores a Firebase session and authenticates only after backend sync succeeds', async () => {
    const getIdToken = vi.fn().mockResolvedValue('firebase-token');
    const restoredUser = firebaseUser({ getIdToken });
    firebaseMocks.auth.currentUser = restoredUser;
    firebaseMocks.syncUser.mockResolvedValue(databaseUser);

    render(
      <AuthBootstrap>
        <AuthStateProbe />
      </AuthBootstrap>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('authenticated'),
    );

    expect(getIdToken).toHaveBeenCalledWith(false);
    expect(firebaseMocks.syncUser).toHaveBeenCalledWith(
      {
        email: 'member@example.com',
        full_name: 'Member One',
        avatar_url: null,
        login_provider: 'google',
      },
      'firebase-token',
      expect.any(Function),
    );
    expect(screen.getByLabelText('auth user')).toHaveTextContent('firebase-1');
    expect(firebaseMocks.onAuthStateChanged).toHaveBeenCalledOnce();
  });

  it('never exposes authenticated state when backend sync fails', async () => {
    const restoredUser = firebaseUser();
    const observedStatuses: string[] = [];
    firebaseMocks.auth.currentUser = restoredUser;
    firebaseMocks.syncUser.mockRejectedValue(
      new Error('token firebase-token belongs to member@example.com'),
    );

    function StatusHistory() {
      const status = useAuthStore((state) => state.status);
      observedStatuses.push(status);
      return <AuthStateProbe />;
    }

    render(
      <AuthBootstrap>
        <StatusHistory />
      </AuthBootstrap>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous'),
    );

    expect(observedStatuses).toContain('syncing');
    expect(observedStatuses).not.toContain('authenticated');
    expect(screen.getByLabelText('auth user')).toHaveTextContent('none');
    expect(screen.getByLabelText('auth error')).toHaveTextContent(
      'Unable to finish signing in. Please try again.',
    );
    expect(screen.getByLabelText('auth error')).not.toHaveTextContent('member@example.com');
  });

  it('does not authenticate a restored user whose Firebase session disappears during sync', async () => {
    const restoredUser = firebaseUser();
    const pendingSync = deferred<User>();
    firebaseMocks.auth.currentUser = restoredUser;
    firebaseMocks.syncUser.mockReturnValue(pendingSync.promise);

    render(
      <AuthBootstrap>
        <AuthStateProbe />
      </AuthBootstrap>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('syncing'),
    );

    firebaseMocks.auth.currentUser = null;
    pendingSync.resolve(databaseUser);

    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous'),
    );
    expect(screen.getByLabelText('auth user')).toHaveTextContent('none');
  });

  it('lets the first auth-state snapshot retry a failed restored-session sync', async () => {
    const restoredUser = firebaseUser();
    firebaseMocks.auth.currentUser = restoredUser;
    firebaseMocks.syncUser
      .mockRejectedValueOnce(new Error('temporary backend outage'))
      .mockResolvedValueOnce(databaseUser);
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, listener: (user: FirebaseUser | null) => void) => {
        authStateListener = listener;
        listener(restoredUser);
        return unsubscribe;
      },
    );

    render(
      <AuthBootstrap>
        <AuthStateProbe />
      </AuthBootstrap>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('authenticated'),
    );
    expect(firebaseMocks.syncUser).toHaveBeenCalledTimes(2);
  });

  it('returns to anonymous state when Firebase emits a logout', async () => {
    const restoredUser = firebaseUser();
    firebaseMocks.auth.currentUser = restoredUser;
    firebaseMocks.syncUser.mockResolvedValue(databaseUser);

    render(
      <AuthBootstrap>
        <AuthStateProbe />
      </AuthBootstrap>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('auth status')).toHaveTextContent('authenticated'),
    );
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');

    act(() => authStateListener?.(null));

    expect(screen.getByLabelText('auth status')).toHaveTextContent('anonymous');
    expect(screen.getByLabelText('auth user')).toHaveTextContent('none');
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('current_workspace_id')).toBeNull();
    expect(firebaseMocks.clearQueryCache).toHaveBeenCalledOnce();
  });
});
