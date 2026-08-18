import { getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

import { env } from '../config/env';
import { AppError } from '../api/errors';
import { beginRegistrationMetadata, clearRegistrationMetadata } from './registration-coordinator';
import { clearE2eAuthSession, e2eAuthToken, isE2eMode, setE2eAuthSession } from './e2e-auth';
import { configureFirebaseEmulators } from './firebase-emulators';

const existingApp = getApps().at(0);
const firebaseApp =
  existingApp ??
  initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });

export const firebaseAuth = getAuth(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

configureFirebaseEmulators({
  enabled: env.VITE_USE_FIREBASE_EMULATORS,
  auth: firebaseAuth,
  storage: firebaseStorage,
});

export async function signInWithEmail(email: string, password: string) {
  if (isE2eMode()) {
    setE2eAuthSession(email);
    return;
  }
  clearRegistrationMetadata(email);
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function registerWithEmail(email: string, password: string, fullName: string) {
  if (isE2eMode()) {
    setE2eAuthSession(email, fullName);
    return;
  }
  const registration = beginRegistrationMetadata(email, fullName);
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  } catch (cause) {
    registration.abort();
    throw cause;
  }

  try {
    await updateProfile(credential.user, { displayName: fullName });
    registration.complete();
    return credential;
  } catch {
    registration.fail();
    try {
      await logoutIfCurrentUser(credential.user.uid);
    } catch {
      // Rollback is best-effort; the bootstrap terminal cleanup is idempotent.
    }
    throw new AppError({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
      retryable: false,
    });
  }
}

export async function signInWithGoogle() {
  if (isE2eMode()) {
    setE2eAuthSession();
    return;
  }
  return signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

export async function logout() {
  if (isE2eMode()) {
    clearE2eAuthSession();
    return;
  }
  await signOut(firebaseAuth);
}

export async function logoutIfCurrentUser(expectedFirebaseUid: string) {
  if (isE2eMode()) {
    clearE2eAuthSession();
    return;
  }
  if (firebaseAuth.currentUser?.uid !== expectedFirebaseUid) return;
  await logout();
}

export function getAuthToken(forceRefresh = false) {
  const localToken = e2eAuthToken();
  if (localToken) return Promise.resolve(localToken);
  return firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? Promise.resolve(null);
}
