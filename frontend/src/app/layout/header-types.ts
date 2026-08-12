export type WorkspaceSyncStatus = 'error' | 'idle' | 'success' | 'syncing';

export interface LogoutController {
  error: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}
