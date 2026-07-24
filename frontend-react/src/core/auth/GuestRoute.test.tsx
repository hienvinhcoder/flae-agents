import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore, type User } from '../stores/auth-store';
import { RequireAnonymousRoute } from './GuestRoute';

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

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current route">{`${location.pathname}${location.search}`}</output>;
}

function renderGuestRoute(initialEntry = '/auth/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RequireAnonymousRoute />}>
          <Route path="/auth/login" element={<h1>Sign in</h1>} />
        </Route>
        <Route path="/dashboard/*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAnonymousRoute', () => {
  beforeEach(() => useAuthStore.getState().resetForBootstrap());

  it.each(['initializing', 'syncing'] as const)(
    'shows only the session skeleton while auth is %s',
    (status) => {
      if (status === 'syncing') useAuthStore.getState().setSyncing();
      renderGuestRoute();

      expect(screen.getByRole('status', { name: /checking your session/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    },
  );

  it('renders the auth outlet for an anonymous visitor', () => {
    useAuthStore.getState().setAnonymous();
    renderGuestRoute();

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('redirects a synchronized user to the dashboard', () => {
    useAuthStore.getState().setAuthenticated(user);
    renderGuestRoute();

    expect(screen.getByLabelText('current route')).toHaveTextContent('/dashboard');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('returns a synchronized user to a safe local return URL', () => {
    useAuthStore.getState().setAuthenticated(user);
    renderGuestRoute(
      '/auth/login?returnUrl=%2Fdashboard%2Fagents%2F42%3Ftab%3Dtools',
    );

    expect(screen.getByLabelText('current route')).toHaveTextContent(
      '/dashboard/agents/42?tab=tools',
    );
  });

  it.each([
    'https://attacker.example/phish',
    '//attacker.example/phish',
    '/\\attacker.example/phish',
  ])('falls back to the dashboard for unsafe return URL %s', (returnUrl) => {
    useAuthStore.getState().setAuthenticated(user);
    renderGuestRoute(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);

    expect(screen.getByLabelText('current route')).toHaveTextContent('/dashboard');
  });

  it('round-trips a protected URL through login and back after authentication', async () => {
    const interaction = userEvent.setup();
    useAuthStore.getState().setAnonymous();

    function LoginHarness() {
      return (
        <div>
          <LocationProbe />
          <button onClick={() => useAuthStore.getState().setAuthenticated(user)} type="button">
            Complete sign in
          </button>
        </div>
      );
    }

    const { ProtectedRoute } = await import('./ProtectedRoute');
    render(
      <MemoryRouter initialEntries={['/dashboard/agents/42?tab=tools']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/agents/:agentId" element={<LocationProbe />} />
          </Route>
          <Route element={<RequireAnonymousRoute />}>
            <Route path="/auth/login" element={<LoginHarness />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('current route')).toHaveTextContent(
      '/auth/login?returnUrl=%2Fdashboard%2Fagents%2F42%3Ftab%3Dtools',
    );

    await interaction.click(screen.getByRole('button', { name: 'Complete sign in' }));

    expect(screen.getByLabelText('current route')).toHaveTextContent(
      '/dashboard/agents/42?tab=tools',
    );
  });
});
