import { z } from 'zod';

import { loginProviderSchema, type User } from './user-schema';

const E2E_AUTH_EVENT = 'flae:e2e-auth-change';
const E2E_AUTH_STORAGE_KEY = 'flae_e2e_auth_session';
const E2E_FIREBASE_UID = '10000000-0000-4000-8000-000000000001';
const E2E_USER_ID = '10000000-0000-4000-8000-000000000001';

const e2eUserSchema = z.strictObject({
  avatar_url: z.string().nullable(),
  current_workspace_id: z.string().nullable(),
  email: z.string().email(),
  firebase_uid: z.string().min(1),
  full_name: z.string(),
  id: z.string(),
  is_active: z.boolean(),
  login_providers: z.array(loginProviderSchema),
});

export function isE2eMode() {
  return import.meta.env.DEV && import.meta.env.VITE_E2E_MODE === 'true';
}

export function readE2eAuthSession(): User | null {
  if (!isE2eMode()) return null;

  try {
    const stored = localStorage.getItem(E2E_AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = e2eUserSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function setE2eAuthSession(email = 'tester@example.invalid', fullName = 'E2E Tester') {
  if (!isE2eMode()) return;
  const user: User = {
    avatar_url: null,
    current_workspace_id: '20000000-0000-4000-8000-000000000001',
    email,
    firebase_uid: E2E_FIREBASE_UID,
    full_name: fullName,
    id: E2E_USER_ID,
    is_active: true,
    login_providers: ['email_password'],
  };
  localStorage.setItem(E2E_AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(E2E_AUTH_EVENT));
}

export function clearE2eAuthSession() {
  if (!isE2eMode()) return;
  localStorage.removeItem(E2E_AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(E2E_AUTH_EVENT));
}

export function subscribeToE2eAuth(listener: () => void) {
  window.addEventListener(E2E_AUTH_EVENT, listener);
  return () => window.removeEventListener(E2E_AUTH_EVENT, listener);
}

export function e2eAuthToken() {
  return isE2eMode() ? 'flae-e2e-token' : null;
}
