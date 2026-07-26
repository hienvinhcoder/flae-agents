import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ logout: vi.fn() }));

import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';
import { expireClientSession } from './session-expiry';

describe('expireClientSession', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuthenticated({
      id: 'user-1', firebase_uid: 'firebase-1', email: 'owner@example.test', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'workspace-1',
    });
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');
  });

  it('clears protected client state and signs out Firebase for router-owned navigation', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private'], { secret: true });
    const signOut = vi.fn().mockResolvedValue(undefined);

    await expireClientSession(queryClient, {
      signOut,
    });

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('retains anonymous cleanup when Firebase sign-out fails', async () => {
    await expireClientSession(new QueryClient(), {
      signOut: () => Promise.reject(new Error('private-token')),
    });

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
  });
});
