import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  logout: vi.fn(),
}));

vi.mock('../../../core/config/env', () => ({
  env: { VITE_API_URL: 'https://api.flae.test/api/v1' },
}));

vi.mock('../../../core/auth/firebase', () => ({
  firebaseAuth: authMocks.auth,
  logout: authMocks.logout,
}));

import type { SyncUserPayload, User } from '../../../core/stores/auth-store';
import { syncUser } from './auth-api';

const payload: SyncUserPayload = {
  email: 'member@example.com',
  full_name: 'Member One',
  avatar_url: null,
  login_provider: 'google',
};

const databaseUser: User = {
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'member@example.com',
  full_name: 'Member One',
  avatar_url: null,
  is_active: true,
  login_providers: ['google'],
  current_workspace_id: null,
};

const backendUserItemResponse = {
  code: '',
  message: '',
  ...databaseUser,
};

async function signOutIfCurrentUser(expectedFirebaseUid: string) {
  if (authMocks.auth.currentUser?.uid !== expectedFirebaseUid) return;
  await authMocks.logout();
}

describe('syncUser', () => {
  afterEach(() => {
    authMocks.auth.currentUser = null;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts the exact backend payload and unwraps the synchronized user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: '200', message: 'Success', data: backendUserItemResponse }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn(), signOutIfCurrentUser),
    ).resolves.toEqual(databaseUser);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.flae.test/api/v1/auth/sync-user');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer firebase-token');
    expect(typeof request.body).toBe('string');
    if (typeof request.body !== 'string') throw new Error('Expected a serialized JSON body');
    expect(JSON.parse(request.body)).toEqual(payload);
  });

  it('rejects a null data response with a safe authentication error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'SUCCESS', message: 'member@example.com', data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = syncUser(
      payload,
      'firebase-1',
      'firebase-token',
      vi.fn(),
      signOutIfCurrentUser,
    );

    await expect(result).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to synchronize your account. Please try again.',
      retryable: true,
    });
    await expect(result).rejects.not.toThrow('member@example.com');
  });

  it('rejects malformed backend user fields and provider enums with a safe error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'SUCCESS',
            message: 'member@example.com',
            data: {
              ...backendUserItemResponse,
              login_providers: ['github'],
              avatar_url: 42,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = syncUser(
      payload,
      'firebase-1',
      'firebase-token',
      vi.fn(),
      signOutIfCurrentUser,
    );

    await expect(result).rejects.toMatchObject({
      kind: 'server',
      message: 'The server returned invalid account data.',
      retryable: false,
    });
    await expect(result).rejects.not.toThrow('member@example.com');
  });

  it.each([
    ['code', 200],
    ['message', null],
  ])('rejects non-string nested response metadata field %s', async (field, value) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '200',
            message: 'Success',
            data: { ...backendUserItemResponse, [field]: value },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn(), signOutIfCurrentUser),
    ).rejects.toMatchObject({
      kind: 'server',
      message: 'The server returned invalid account data.',
      retryable: false,
    });
  });

  it('rejects a synchronized user whose Firebase UID does not match the active session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'SUCCESS',
            message: 'Synced',
            data: { ...backendUserItemResponse, firebase_uid: 'different-firebase-user' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn(), signOutIfCurrentUser),
    ).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to verify the synchronized account.',
      retryable: false,
    });
  });

  it('signs out Firebase when the sync client receives a terminal second 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    authMocks.logout.mockResolvedValue(undefined);
    authMocks.auth.currentUser = { uid: 'firebase-1' };

    await expect(
      syncUser(
        payload,
        'firebase-1',
        'firebase-token',
        vi.fn().mockResolvedValue('fresh-token'),
        signOutIfCurrentUser,
      ),
    ).rejects.toMatchObject({
      kind: 'auth',
      message: 'Your session has expired. Please sign in again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authMocks.logout).toHaveBeenCalledOnce();
  });

  it('does not sign out a newer Firebase user when an older sync receives a terminal 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    authMocks.auth.currentUser = { uid: 'firebase-2' };

    await expect(
      syncUser(
        payload,
        'firebase-1',
        'firebase-token',
        vi.fn().mockResolvedValue('fresh-token'),
        signOutIfCurrentUser,
      ),
    ).rejects.toMatchObject({ kind: 'auth' });

    expect(authMocks.logout).not.toHaveBeenCalled();
  });
});
