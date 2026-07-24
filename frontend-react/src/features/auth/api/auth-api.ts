import { AppError } from '../../../core/api/errors';
import { createApiClient } from '../../../core/api/client';
import { userItemResponseSchema } from '../../../core/auth/user-schema';
import { env } from '../../../core/config/env';
import type { SyncUserPayload, User } from '../../../core/stores/auth-store';

export async function syncUser(
  payload: SyncUserPayload,
  expectedFirebaseUid: string,
  initialToken: string,
  refreshToken: () => Promise<string>,
  signOutIfCurrentUser: (expectedFirebaseUid: string) => Promise<void>,
): Promise<User> {
  const client = createApiClient({
    baseUrl: env.VITE_API_URL,
    tokenProvider: (forceRefresh) =>
      forceRefresh ? refreshToken() : Promise.resolve(initialToken),
    onUnauthorized: () => signOutIfCurrentUser(expectedFirebaseUid),
  });
  const responseData = await client.request<unknown>({
    path: '/auth/sync-user',
    method: 'POST',
    body: {
      email: payload.email,
      full_name: payload.full_name,
      avatar_url: payload.avatar_url ?? null,
      login_provider: payload.login_provider,
    },
  });

  if (!responseData) {
    throw new AppError({
      kind: 'auth',
      message: 'Unable to synchronize your account. Please try again.',
      retryable: true,
    });
  }

  const parsedUser = userItemResponseSchema.safeParse(responseData);
  if (!parsedUser.success) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned invalid account data.',
      retryable: false,
    });
  }

  if (parsedUser.data.firebase_uid !== expectedFirebaseUid) {
    throw new AppError({
      kind: 'auth',
      message: 'Unable to verify the synchronized account.',
      retryable: false,
    });
  }

  const user: User = parsedUser.data;
  return user;
}
