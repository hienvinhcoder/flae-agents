import { create } from 'zustand';

import type { LoginProvider, User } from '../auth/user-schema';

export type { LoginProvider, User } from '../auth/user-schema';

export interface SyncUserPayload {
  email: string;
  full_name: string;
  avatar_url?: string | null;
  login_provider: LoginProvider;
}

export type AuthStatus =
  | 'initializing'
  | 'anonymous'
  | 'syncing'
  | 'sync_failed'
  | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  retryRevision: number;
  resetForBootstrap: () => void;
  retryBootstrap: () => void;
  setSyncing: () => void;
  setSyncFailed: (error: string) => void;
  setAnonymous: (error?: string | null) => void;
  setAuthenticated: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialState = {
  status: 'initializing' as const,
  user: null,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  retryRevision: 0,
  resetForBootstrap: () => set(initialState),
  retryBootstrap: () =>
    set((state) => ({ ...initialState, retryRevision: state.retryRevision + 1 })),
  setSyncing: () => set({ status: 'syncing', user: null, error: null }),
  setSyncFailed: (error) =>
    set({ status: 'sync_failed', user: null, isLoading: false, error }),
  setAnonymous: (error = null) =>
    set({ status: 'anonymous', user: null, isLoading: false, error }),
  setAuthenticated: (user) =>
    set({ status: 'authenticated', user, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
