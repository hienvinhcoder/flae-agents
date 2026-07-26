import { useQueryClient } from '@tanstack/react-query';
import { getRedirectResult, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useEffect, type PropsWithChildren } from 'react';

import { syncUser } from '../../features/auth/api/auth-api';
import { useAuthStore, type LoginProvider, type SyncUserPayload } from '../stores/auth-store';
import { firebaseAuth, logoutIfCurrentUser } from './firebase';
import { consumeRegistrationMetadata } from './registration-coordinator';
import { clearClientSession, clearProtectedClientData } from './session-cleanup';
import { isE2eMode, readE2eAuthSession, subscribeToE2eAuth } from './e2e-auth';

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
  const retryRevision = useAuthStore((state) => state.retryRevision);

  useEffect(() => {
    if (isE2eMode()) {
      const restoreLocalSession = () => {
        const user = readE2eAuthSession();
        if (user) useAuthStore.getState().setAuthenticated(user);
        else clearClientSession(queryClient);
      };
      useAuthStore.getState().resetForBootstrap();
      restoreLocalSession();
      return subscribeToE2eAuth(restoreLocalSession);
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    let operation = 0;
    let terminalError: string | null = null;
    let terminalSync: { operation: number; uid: string } | null = null;

    const clearAnonymousSession = (error: string | null = terminalError) => {
      clearClientSession(queryClient, error);
    };

    const exposeRecoverableSyncFailure = () => {
      useAuthStore.getState().setSyncFailed(SYNC_ERROR_MESSAGE);
      clearProtectedClientData(queryClient);
    };

    const synchronize = async (firebaseUser: FirebaseUser) => {
      const currentOperation = ++operation;
      let cleanupAttempted = false;
      useAuthStore.getState().setSyncing();

      const cleanupCurrentSession = async (expectedFirebaseUid: string) => {
        if (
          !active ||
          operation !== currentOperation ||
          expectedFirebaseUid !== firebaseUser.uid ||
          firebaseAuth.currentUser?.uid !== expectedFirebaseUid
        ) {
          return;
        }

        cleanupAttempted = true;
        terminalError = SYNC_ERROR_MESSAGE;
        terminalSync = { operation: currentOperation, uid: expectedFirebaseUid };
        await logoutIfCurrentUser(expectedFirebaseUid);
      };

      try {
        const registrationMetadata = await consumeRegistrationMetadata(firebaseUser.email);
        const initialToken = await firebaseUser.getIdToken(false);
        const user = await syncUser(
          syncPayloadFor(firebaseUser, registrationMetadata?.fullName),
          firebaseUser.uid,
          initialToken,
          () => firebaseUser.getIdToken(true),
          cleanupCurrentSession,
        );

        if (active && operation === currentOperation) {
          if (firebaseAuth.currentUser?.uid === firebaseUser.uid) {
            terminalError = null;
            terminalSync = null;
            useAuthStore.getState().setAuthenticated(user);
          } else {
            clearAnonymousSession();
          }
        }
      } catch {
        if (!active || operation !== currentOperation) return;

        terminalError = SYNC_ERROR_MESSAGE;
        terminalSync = { operation: currentOperation, uid: firebaseUser.uid };

        if (!cleanupAttempted) {
          try {
            await cleanupCurrentSession(firebaseUser.uid);
          } catch {
            // A retained Firebase session is exposed as recoverable sync failure below.
          }
        }

        if (!active || operation !== currentOperation) return;

        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) {
          clearAnonymousSession();
        } else if (currentUser.uid === firebaseUser.uid) {
          exposeRecoverableSyncFailure();
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
          if (terminalSync?.operation === operation) {
            clearAnonymousSession();
            return;
          }

          operation += 1;
          clearAnonymousSession();
          return;
        }

        terminalError = null;
        terminalSync = null;
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
  }, [queryClient, retryRevision]);

  return children;
}
