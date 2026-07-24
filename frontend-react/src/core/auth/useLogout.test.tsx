import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, type User } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';

const firebaseMocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('./firebase', () => ({ logout: firebaseMocks.logout }));

import { useLogout } from './useLogout';

const user: User = {
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'member@example.com',
  full_name: 'Member One',
  is_active: true,
  login_providers: ['google'],
  avatar_url: null,
  current_workspace_id: 'workspace-1',
};

function LogoutHarness() {
  const location = useLocation();
  const { error, isLoading, logout } = useLogout();
  return (
    <div>
      <button disabled={isLoading} onClick={() => void logout()} type="button">
        {isLoading ? 'Signing out…' : 'Sign out'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <output aria-label="current route">{location.pathname}</output>
    </div>
  );
}

function renderLogout(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/settings']}>
        <LogoutHarness />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('useLogout', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().setAuthenticated(user);
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');
    queryClient = new QueryClient();
    queryClient.setQueryData(['workspaces'], [{ id: 'workspace-1' }]);
  });

  it('clears all client session state and replaces the route after Firebase signs out', async () => {
    const interaction = userEvent.setup();
    firebaseMocks.logout.mockResolvedValue(undefined);
    renderLogout(queryClient);

    await interaction.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(screen.getByLabelText('current route')).toHaveTextContent('/auth/login'),
    );
    expect(firebaseMocks.logout).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
      isLoading: false,
      error: null,
    });
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('current_workspace_id')).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('keeps the existing session, workspace, and cache when Firebase sign-out fails', async () => {
    const interaction = userEvent.setup();
    firebaseMocks.logout.mockRejectedValue(
      new Error('member@example.com could not sign out with firebase-token'),
    );
    renderLogout(queryClient);

    await interaction.click(screen.getByRole('button', { name: 'Sign out' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to sign out. Please try again.');
    expect(alert).not.toHaveTextContent('member@example.com');
    expect(alert).not.toHaveTextContent('firebase-token');
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user,
      isLoading: false,
    });
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('workspace-1');
    expect(localStorage.getItem('current_workspace_id')).toBe('workspace-1');
    expect(queryClient.getQueryData(['workspaces'])).toEqual([{ id: 'workspace-1' }]);
    expect(screen.getByLabelText('current route')).toHaveTextContent('/dashboard/settings');
  });
});
