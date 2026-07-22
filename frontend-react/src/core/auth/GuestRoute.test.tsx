import { render, screen } from '@testing-library/react';
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
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current route">{location.pathname}</output>;
}

function renderGuestRoute() {
  return render(
    <MemoryRouter initialEntries={['/auth/login']}>
      <Routes>
        <Route element={<RequireAnonymousRoute />}>
          <Route path="/auth/login" element={<h1>Sign in</h1>} />
        </Route>
        <Route path="/dashboard" element={<LocationProbe />} />
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
});
