import type { QueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';

export function clearClientSession(queryClient: QueryClient, error: string | null = null) {
  useAuthStore.getState().setAnonymous(error);
  useWorkspaceStore.getState().reset();
  queryClient.clear();
}
