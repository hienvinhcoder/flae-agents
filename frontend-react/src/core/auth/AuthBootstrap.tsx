import { useQueryClient } from '@tanstack/react-query';
import { getRedirectResult, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useEffect, type PropsWithChildren } from 'react';

import { syncUser } from '../../features/auth/api/auth-api';
import { useAuthStore, type LoginProvider, type SyncUserPayload } from '../stores/auth-store';
import { firebaseAuth, logout as logoutFromFirebase } from './firebase';
import { consumeRegistrationMetadata } from './registration-coordinator';
import { clearClientSession } from './session-cleanup';

const SYNC_ERROR_MESSAGE = 'Unable to finish signing in. Please try again.';

function loginProviderFor(user: FirebaseUser): LoginProvider {
  const providerId = user.providerData[0]?.providerId;
  if (providerId === 'google.com') return 'google';
  if (providerId === 'facebook.com') return 'facebook';
  return 'email_password';
}

function syncPayloadFor(user: FirebaseUser, registrationFullName?: string): SyncUserPayload {
  return {
    email: user.email ?? '',
    full_name: registrationFullName ?? (user.displayName?.trim() || 'User'),
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
    let terminalError: string | null = null;

    const clearAnonymousSession = (error: string | null = terminalError) => {
      clearClientSession(queryClient, error);
    };

    const terminateSync = async () => {
      terminalError = SYNC_ERROR_MESSAGE;
      try {
        await logoutFromFirebase();
      } catch {
        // A second sign-out may already have run through the API client's 401 handler.
      }
      if (active) clearAnonymousSession();
    };

    const synchronize = async (firebaseUser: FirebaseUser) => {
      const currentOperation = ++operation;
      useAuthStore.getState().setSyncing();

      try {
        const registrationMetadata = await consumeRegistrationMetadata(firebaseUser.email);
        const initialToken = await firebaseUser.getIdToken(false);
        const user = await syncUser(
          syncPayloadFor(firebaseUser, registrationMetadata?.fullName),
          firebaseUser.uid,
          initialToken,
          () => firebaseUser.getIdToken(true),
        );

        if (active && operation === currentOperation) {
          if (firebaseAuth.currentUser?.uid === firebaseUser.uid) {
            terminalError = null;
            useAuthStore.getState().setAuthenticated(user);
          } else {
            clearAnonymousSession();
          }
        }
      } catch {
        if (active && operation === currentOperation) {
          await terminateSync();
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

      let skipInitialUid = firebaseAuth.currentUser?.uid ?? null;
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

        terminalError = null;
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
