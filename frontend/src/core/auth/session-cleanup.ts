import type { QueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';

export function clearProtectedClientData(queryClient: QueryClient) {
  useWorkspaceStore.getState().reset();
  queryClient.clear();
}

export function clearClientSession(queryClient: QueryClient, error: string | null = null) {
  useAuthStore.getState().setAnonymous(error);
  clearProtectedClientData(queryClient);
}
