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

import { env } from '../config/env';
import { AppError } from '../api/errors';
import { beginRegistrationMetadata, clearRegistrationMetadata } from './registration-coordinator';

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

export async function signInWithEmail(email: string, password: string) {
  clearRegistrationMetadata(email);
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function registerWithEmail(email: string, password: string, fullName: string) {
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
  return signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

export async function logout() {
  await signOut(firebaseAuth);
}

export async function logoutIfCurrentUser(expectedFirebaseUid: string) {
  if (firebaseAuth.currentUser?.uid !== expectedFirebaseUid) return;
  await logout();
}
