import { create } from 'zustand';

export type LoginProvider = 'email_password' | 'google' | 'facebook';

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  login_providers?: LoginProvider[];
  current_workspace_id?: string | null;
}

export interface SyncUserPayload {
  email: string;
  full_name: string;
  avatar_url?: string | null;
  login_provider: LoginProvider;
}

export type AuthStatus = 'initializing' | 'anonymous' | 'syncing' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  resetForBootstrap: () => void;
  setSyncing: () => void;
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
  resetForBootstrap: () => set(initialState),
  setSyncing: () => set({ status: 'syncing', user: null, error: null }),
  setAnonymous: (error = null) =>
    set({ status: 'anonymous', user: null, isLoading: false, error }),
  setAuthenticated: (user) =>
    set({ status: 'authenticated', user, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
