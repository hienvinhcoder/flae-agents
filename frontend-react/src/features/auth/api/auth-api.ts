import { AppError } from '../../../core/api/errors';
import { createApiClient } from '../../../core/api/client';
import { env } from '../../../core/config/env';
import type { SyncUserPayload, User } from '../../../core/stores/auth-store';

export async function syncUser(
  payload: SyncUserPayload,
  initialToken: string,
  refreshToken: () => Promise<string>,
): Promise<User> {
  const client = createApiClient({
    baseUrl: env.VITE_API_URL,
    tokenProvider: (forceRefresh) =>
      forceRefresh ? refreshToken() : Promise.resolve(initialToken),
  });
  const user = await client.request<User>({
    path: '/auth/sync-user',
    method: 'POST',
    body: {
      email: payload.email,
      full_name: payload.full_name,
      avatar_url: payload.avatar_url ?? null,
      login_provider: payload.login_provider,
    },
  });

  if (!user) {
    throw new AppError({
      kind: 'auth',
      message: 'Unable to synchronize your account. Please try again.',
      retryable: true,
    });
  }

  return user;
}
