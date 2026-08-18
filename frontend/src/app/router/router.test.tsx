import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, matchRoutes, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { TestI18nProvider } from '../../../tests/TestI18nProvider';
import type { User } from '../../core/auth/user-schema';
import { useAuthStore } from '../../core/stores/auth-store';
import { createLazyElement } from './lazy-route';
import { createRouteObjects } from './router';

const retainedPaths = [
  '/', '/auth', '/auth/login', '/auth/register', '/invite', '/dashboard', '/dashboard/chat', '/dashboard/agents',
  '/dashboard/agents/new', '/dashboard/agents/agent-1/edit', '/dashboard/agents/agent-1/chat',
  '/dashboard/knowledge', '/dashboard/knowledge/graph', '/dashboard/topics',
  '/dashboard/topics/topic-1', '/dashboard/settings',
];

const removedPaths = ['/dashboard/briefing', '/dashboard/inbox', '/dashboard/reports'];

const authenticatedUser: User = {
  avatar_url: null,
  current_workspace_id: null,
  email: 'owner@example.com',
  firebase_uid: 'firebase-1',
  full_name: 'Owner',
  id: 'user-1',
  is_active: true,
  login_providers: ['google'],
};

describe('application router', () => {
  beforeEach(() => useAuthStore.getState().setAnonymous());

  it.each(retainedPaths)('matches the retained path %s', (path) => {
    expect(matchRoutes(createRouteObjects(<Outlet />), path)).not.toBeNull();
  });

  it.each(removedPaths)('does not match the removed path %s', (path) => {
    expect(matchRoutes(createRouteObjects(<Outlet />), path)).toBeNull();
  });

  it('redirects the authenticated dashboard index to chat', async () => {
    useAuthStore.getState().setAuthenticated(authenticatedUser);
    const router = createMemoryRouter(createRouteObjects(<Outlet />), { initialEntries: ['/dashboard'] });
    const queryClient = new QueryClient();
    render(
      <TestI18nProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </TestI18nProvider>,
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard/chat');
    });
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
