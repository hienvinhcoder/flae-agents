import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../core/stores/auth-store';
import type { User } from '../../../core/auth/user-schema';
import { useWorkspaceStore } from '../../../core/stores/workspace-store';
import { queryKeys } from '../../../shared/lib/query-keys';
import type { Workspace } from '../types/workspace';
import { resolveWorkspaceId, useSelectWorkspace, useWorkspaces } from './use-workspaces';

const workspaces: Workspace[] = [
  { id: 'ws-1', name: 'One', owner_uid: 'owner-1', created_at: null },
  { id: 'ws-2', name: 'Two', owner_uid: 'owner-2', created_at: null },
];

const user: User = {
  id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com',
  full_name: 'Owner', is_active: true, login_providers: ['google'], avatar_url: null,
  current_workspace_id: 'ws-2',
};

describe('workspace selection', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.getState().reset();
    useAuthStore.getState().setAnonymous();
  });

  it('prioritizes a valid saved ID, then the user profile, then the first accessible workspace', () => {
    expect(resolveWorkspaceId('ws-2', 'ws-1', workspaces)).toBe('ws-2');
    expect(resolveWorkspaceId('missing', 'ws-2', workspaces)).toBe('ws-2');
    expect(resolveWorkspaceId('missing', 'missing', workspaces)).toBe('ws-1');
    expect(resolveWorkspaceId('missing', 'missing', [])).toBeNull();
  });

  it('clears an invalid saved ID and initializes from the authenticated user profile', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('missing');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-2',
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    renderHook(() => useWorkspaces({ fetchWorkspaces: () => Promise.resolve(workspaces), syncSelection: vi.fn() }), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-2'));
    expect(localStorage.getItem('current_workspace_id')).toBe('ws-2');
  });

  it('cancels old workspace feature queries before exposing the new selection', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    const queryClient = new QueryClient();
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries').mockResolvedValue();
    const events: string[] = [];
    const syncSelection = vi.fn().mockImplementation(() => {
      events.push(`remote:${useWorkspaceStore.getState().currentWorkspaceId}`);
      return Promise.resolve(user);
    });
    cancelQueries.mockImplementation(() => { events.push('cancel'); return Promise.resolve(); });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSelectWorkspace({ syncSelection }), { wrapper });

    await act(() => result.current('ws-2'));

    expect(cancelQueries).toHaveBeenCalledOnce();
    const predicate = cancelQueries.mock.calls[0]?.[0]?.predicate;
    expect(predicate?.({ queryKey: ['workspaces', 'ws-1', 'knowledge'] } as never)).toBe(true);
    expect(predicate?.({ queryKey: ['workspaces'] } as never)).toBe(false);
    expect(syncSelection).toHaveBeenCalledWith('ws-2');
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-2');
    expect(events).toEqual(['cancel', 'remote:ws-2']);
    expect(useAuthStore.getState().user?.current_workspace_id).not.toBe('ws-2');
  });

  it('retains the manual selection and reports failure without mutating the authenticated user', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-1',
    });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() => useSelectWorkspace({ syncSelection: vi.fn().mockRejectedValue(new Error('owner@example.com ws-2 firebase-token')) }), { wrapper });

    await expect(act(() => result.current('ws-2'))).rejects.toThrow();
    expect(useWorkspaceStore.getState()).toMatchObject({ currentWorkspaceId: 'ws-2', syncStatus: 'error' });
    expect(useAuthStore.getState().user?.current_workspace_id).toBe('ws-1');
    expect(warning).toHaveBeenCalledWith('Workspace selection synchronization failed.');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('owner@example.com');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('ws-2');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('firebase-token');
  });

  it('clears a prior manual error when a later workspace synchronization succeeds', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('ws-1');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const syncSelection = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(user);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSelectWorkspace({ syncSelection }), { wrapper });

    await expect(act(() => result.current('ws-2'))).rejects.toThrow('offline');
    expect(useWorkspaceStore.getState().syncStatus).toBe('error');
    await act(() => result.current('ws-1'));
    expect(useWorkspaceStore.getState().syncStatus).toBe('success');
  });

  it('persists automatic fallback before syncing and applies only validated successful user data', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('missing');
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.com', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: null,
    });
    const syncSelection = vi.fn().mockImplementation(() => {
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-1');
      expect(localStorage.getItem('current_workspace_id')).toBe('ws-1');
      return Promise.resolve({ ...user, current_workspace_id: 'ws-1' });
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    renderHook(() => useWorkspaces({ fetchWorkspaces: () => Promise.resolve(workspaces), syncSelection }), { wrapper });

    await waitFor(() => expect(useAuthStore.getState().user?.current_workspace_id).toBe('ws-1'));
    expect(syncSelection).toHaveBeenCalledOnce();
    expect(useWorkspaceStore.getState().syncStatus).toBe('success');
  });

  it('completes one cached automatic sync across the StrictMode setup-cleanup-setup cycle', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('missing');
    useAuthStore.getState().setAuthenticated({ ...user, current_workspace_id: null });
    let resolveSync!: (syncedUser: User) => void;
    const syncSelection = vi.fn().mockReturnValue(new Promise<User>((resolve) => {
      resolveSync = resolve;
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.workspaces, workspaces);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useWorkspaces({ fetchWorkspaces: () => Promise.resolve(workspaces), syncSelection }), {
      reactStrictMode: true,
      wrapper,
    });

    await waitFor(() => expect(syncSelection).toHaveBeenCalledOnce());
    act(() => resolveSync({ ...user, current_workspace_id: 'ws-1' }));

    await waitFor(() => expect(useAuthStore.getState().user?.current_workspace_id).toBe('ws-1'));
    expect(syncSelection).toHaveBeenCalledOnce();
    expect(useWorkspaceStore.getState().syncStatus).toBe('success');
  });

  it('retains an automatically selected fallback and authenticated user after remote sync failure', async () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('missing');
    const originalUser: User = { ...user, current_workspace_id: null };
    useAuthStore.getState().setAuthenticated(originalUser);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() => useWorkspaces({
      fetchWorkspaces: () => Promise.resolve(workspaces),
      syncSelection: vi.fn().mockRejectedValue(new Error('owner@example.com ws-1 firebase-token')),
    }), { wrapper });

    await waitFor(() => expect(useWorkspaceStore.getState().syncStatus).toBe('error'));
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-1');
    expect(localStorage.getItem('current_workspace_id')).toBe('ws-1');
    expect(useAuthStore.getState().user).toEqual(originalUser);
    expect(warning).toHaveBeenCalledWith('Workspace selection synchronization failed.');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('owner@example.com');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('ws-1');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('firebase-token');
  });
});
