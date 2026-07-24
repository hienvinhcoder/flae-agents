import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore, type User } from '../stores/auth-store';
import { ProtectedRoute } from './ProtectedRoute';

const user: User = {
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'member@example.com',
  full_name: 'Member One',
  is_active: true,
  login_providers: ['google'],
  avatar_url: null,
  current_workspace_id: null,
};

function LoginLocation() {
  const location = useLocation();
  return <output aria-label="login location">{`${location.pathname}${location.search}`}</output>;
}

function renderProtectedRoute(initialEntry = '/dashboard/agents/42?tab=tools') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/agents/:agentId" element={<h1>Agent detail</h1>} />
        </Route>
        <Route path="/auth/login" element={<LoginLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => useAuthStore.getState().resetForBootstrap());

  it('renders a status skeleton while authentication is initializing', () => {
    renderProtectedRoute();

    expect(screen.getByRole('status', { name: /checking your session/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agent detail' })).not.toBeInTheDocument();
  });

  it('preserves the complete requested URL when redirecting an anonymous user', () => {
    useAuthStore.getState().setAnonymous();
    renderProtectedRoute();

    const location = screen.getByLabelText('login location').textContent ?? '';
    const url = new URL(location, 'https://flae.local');
    expect(url.pathname).toBe('/auth/login');
    expect(url.searchParams.get('returnUrl')).toBe('/dashboard/agents/42?tab=tools');
  });

  it('renders the protected outlet only for a synchronized user', () => {
    useAuthStore.getState().setAuthenticated(user);
    renderProtectedRoute();

    expect(screen.getByRole('heading', { name: 'Agent detail' })).toBeInTheDocument();
  });

  it('keeps a retained but unsynchronized Firebase session out of protected routes', () => {
    useAuthStore.getState().setSyncFailed('Unable to finish signing in. Please try again.');
    renderProtectedRoute();

    expect(screen.queryByRole('heading', { name: 'Agent detail' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('login location')).toHaveTextContent('/auth/login');
  });
});
