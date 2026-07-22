import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';
import { logout as logoutFromFirebase } from './firebase';
import { clearClientSession } from './session-cleanup';

const LOGOUT_ERROR_MESSAGE = 'Unable to sign out. Please try again.';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const logout = useCallback(async () => {
    const authStore = useAuthStore.getState();
    authStore.clearError();
    authStore.setLoading(true);

    try {
      await logoutFromFirebase();
      clearClientSession(queryClient);
      void navigate('/auth/login', { replace: true });
    } catch {
      useAuthStore.getState().setError(LOGOUT_ERROR_MESSAGE);
      useAuthStore.getState().setLoading(false);
    }
  }, [navigate, queryClient]);

  return { error, isLoading, logout };
}
