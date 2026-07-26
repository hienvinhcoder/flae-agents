import type { QueryClient } from '@tanstack/react-query';

import { logout } from './firebase';
import { clearClientSession } from './session-cleanup';

interface SessionExpiryOptions {
  signOut?: () => Promise<void>;
}

export async function expireClientSession(
  queryClient: QueryClient,
  { signOut = logout }: SessionExpiryOptions = {},
) {
  clearClientSession(queryClient);

  try {
    await signOut();
  } catch {
    // Router-owned anonymous redirects remain authoritative if Firebase is unavailable.
  }
}
