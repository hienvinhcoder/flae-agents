import { createApiClient } from '../../../core/api/client';
import { firebaseAuth } from '../../../core/auth/firebase';
import { env } from '../../../core/config/env';
import { listWorkspaces, selectWorkspace } from './workspace-api';

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: (forceRefresh) => firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? Promise.resolve(null),
});

export const fetchWorkspaces = () => listWorkspaces(client);
export const syncWorkspaceSelection = (workspaceId: string) => selectWorkspace(workspaceId, client);
