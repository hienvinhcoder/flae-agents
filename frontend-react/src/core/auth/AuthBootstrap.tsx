import { useQueryClient } from '@tanstack/react-query';
import { getRedirectResult, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useEffect, type PropsWithChildren } from 'react';

import { syncUser } from '../../features/auth/api/auth-api';
import { useAuthStore, type LoginProvider, type SyncUserPayload } from '../stores/auth-store';
import { useWorkspaceStore } from '../stores/workspace-store';
import { firebaseAuth } from './firebase';

const SYNC_ERROR_MESSAGE = 'Unable to finish signing in. Please try again.';

function loginProviderFor(user: FirebaseUser): LoginProvider {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === 'google.com') return 'google';
  if (providerId === 'facebook.com') return 'facebook';
  return 'email_password';
}

function syncPayloadFor(user: FirebaseUser): SyncUserPayload {
  return {
    email: user.email ?? '',
    full_name: user.displayName?.trim() || 'User',
    avatar_url: user.photoURL ?? null,
    login_provider: loginProviderFor(user),
  };
}

export function AuthBootstrap({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let operation = 0;

    const clearAnonymousSession = (error: string | null = null) => {
      useAuthStore.getState().setAnonymous(error);
      useWorkspaceStore.getState().reset();
      queryClient.clear();
    };

    const synchronize = async (firebaseUser: FirebaseUser) => {
      const currentOperation = ++operation;
      useAuthStore.getState().setSyncing();

      try {
        const initialToken = await firebaseUser.getIdToken(false);
        const user = await syncUser(
          syncPayloadFor(firebaseUser),
          initialToken,
          () => firebaseUser.getIdToken(true),
        );

        if (active && operation === currentOperation) {
          if (firebaseAuth.currentUser?.uid === firebaseUser.uid) {
            useAuthStore.getState().setAuthenticated(user);
          } else {
            clearAnonymousSession();
          }
        }
      } catch {
        if (active && operation === currentOperation) {
          clearAnonymousSession(SYNC_ERROR_MESSAGE);
        }
      }
    };

    const initialize = async () => {
      useAuthStore.getState().resetForBootstrap();

      try {
        await getRedirectResult(firebaseAuth);
      } catch {
        // Redirect state can be absent or stale; Firebase readiness remains authoritative.
      }

      if (!active) return;
      await firebaseAuth.authStateReady();
      if (!active) return;

      const restoredUser = firebaseAuth.currentUser;
      if (restoredUser) {
        await synchronize(restoredUser);
      } else {
        clearAnonymousSession();
      }

      if (!active) return;

      const restoredWasSynchronized =
        restoredUser !== null && useAuthStore.getState().status === 'authenticated';
      let skipInitialUid = restoredWasSynchronized ? restoredUser.uid : null;
      unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
        if (!active) return;

        if (skipInitialUid !== null && firebaseUser?.uid === skipInitialUid) {
          skipInitialUid = null;
          return;
        }
        skipInitialUid = null;

        if (!firebaseUser) {
          operation += 1;
          clearAnonymousSession();
          return;
        }

        void synchronize(firebaseUser);
      });
    };

    void initialize().catch(() => {
      if (active) clearAnonymousSession(SYNC_ERROR_MESSAGE);
    });

    return () => {
      active = false;
      operation += 1;
      unsubscribe?.();
    };
  }, [queryClient]);

  return children;
}
