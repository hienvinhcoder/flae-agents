import { render, screen, waitFor } from '@testing-library/react';
import type { User as FirebaseUser } from 'firebase/auth';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { User } from '../stores/auth-store';

const firebaseMocks = vi.hoisted(() => ({
  auth: {
    authStateReady: vi.fn<() => Promise<void>>(),
    currentUser: null as FirebaseUser | null,
  },
  clearQueryCache: vi.fn(),
  getRedirectResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: firebaseMocks.clearQueryCache }),
}));

vi.mock('./firebase', () => ({
  firebaseAuth: firebaseMocks.auth,
  logoutIfCurrentUser: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getRedirectResult: firebaseMocks.getRedirectResult,
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
}));

vi.mock('../../features/auth/api/auth-api', () => ({ syncUser: vi.fn() }));

import { AuthBootstrap } from './AuthBootstrap';
import { useAuthStore } from '../stores/auth-store';

const e2eUser: User = {
  avatar_url: null,
  current_workspace_id: '20000000-0000-4000-8000-000000000001',
  email: 'tester@example.invalid',
  firebase_uid: '10000000-0000-4000-8000-000000000001',
  full_name: 'E2E Tester',
  id: '10000000-0000-4000-8000-000000000001',
  is_active: true,
  login_providers: ['email_password'],
};

beforeEach(() => {
  vi.stubEnv('VITE_E2E_MODE', 'true');
  firebaseMocks.auth.authStateReady.mockResolvedValue();
  firebaseMocks.getRedirectResult.mockResolvedValue(null);
  firebaseMocks.onAuthStateChanged.mockReturnValue(() => undefined);
  useAuthStore.getState().resetForBootstrap();
  localStorage.setItem('flae_e2e_auth_session', JSON.stringify(e2eUser));
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

it('restores the gated E2E session without contacting Firebase', async () => {
  function Probe() {
    const status = useAuthStore((state) => state.status);
    const user = useAuthStore((state) => state.user);
    return <output aria-label="auth state">{status}:{user?.email ?? 'none'}</output>;
  }

  render(<AuthBootstrap><Probe /></AuthBootstrap>);

  await waitFor(() => expect(screen.getByLabelText('auth state')).toHaveTextContent(
    'authenticated:tester@example.invalid',
  ));
  expect(firebaseMocks.auth.authStateReady).not.toHaveBeenCalled();
  expect(firebaseMocks.getRedirectResult).not.toHaveBeenCalled();
  expect(firebaseMocks.onAuthStateChanged).not.toHaveBeenCalled();
});
