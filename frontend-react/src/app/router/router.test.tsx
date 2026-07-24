import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, matchRoutes, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '../../core/stores/auth-store';
import { createLazyElement } from './lazy-route';
import { createRouteObjects } from './router';

const parityPaths = [
  '/', '/auth', '/auth/login', '/auth/register', '/invite', '/dashboard',
  '/dashboard/briefing', '/dashboard/inbox', '/dashboard/chat', '/dashboard/agents',
  '/dashboard/agents/new', '/dashboard/agents/agent-1/edit', '/dashboard/agents/agent-1/chat',
  '/dashboard/knowledge', '/dashboard/knowledge/graph', '/dashboard/topics',
  '/dashboard/topics/topic-1', '/dashboard/reports', '/dashboard/settings',
];

describe('application router', () => {
  beforeEach(() => useAuthStore.getState().setAnonymous());

  it.each(parityPaths)('matches the frozen parity path %s', (path) => {
    expect(matchRoutes(createRouteObjects(<Outlet />), path)).not.toBeNull();
  });

  it('redirects authenticated /dashboard visits to the lazy briefing page', async () => {
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner', is_active: true,
      login_providers: ['google'], avatar_url: null, current_workspace_id: null,
    });
    const router = createMemoryRouter(createRouteObjects(<Outlet />), { initialEntries: ['/dashboard'] });
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/briefing'));
    expect(await screen.findByRole('heading', { name: 'Morning briefing' })).toBeInTheDocument();
  });

  it('renders a semantic skeleton while a lazy route module is unresolved', async () => {
    let resolveModule!: (module: { default: () => React.ReactNode }) => void;
    const modulePromise = new Promise<{ default: () => React.ReactNode }>((resolve) => { resolveModule = resolve; });
    const router = createMemoryRouter([{ path: '/', element: createLazyElement(() => modulePromise) }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
    await act(() => {
      resolveModule({ default: () => <h1>Delayed page</h1> });
      return Promise.resolve();
    });
    expect(await screen.findByRole('heading', { name: 'Delayed page' })).toBeInTheDocument();
  });
});
