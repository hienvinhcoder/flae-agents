import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('../../../core/config/env', () => ({
  env: { VITE_API_URL: 'https://api.flae.test/api/v1' },
}));

vi.mock('../../../core/auth/firebase', () => ({ logout: authMocks.logout }));

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

describe('syncUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts the exact backend payload and unwraps the synchronized user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'SUCCESS', message: 'Synced', data: databaseUser }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn()),
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

    const result = syncUser(payload, 'firebase-1', 'firebase-token', vi.fn());

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
            data: { ...databaseUser, login_providers: ['github'], avatar_url: 42 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = syncUser(payload, 'firebase-1', 'firebase-token', vi.fn());

    await expect(result).rejects.toMatchObject({
      kind: 'server',
      message: 'The server returned invalid account data.',
      retryable: false,
    });
    await expect(result).rejects.not.toThrow('member@example.com');
  });

  it('rejects a synchronized user whose Firebase UID does not match the active session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'SUCCESS',
            message: 'Synced',
            data: { ...databaseUser, firebase_uid: 'different-firebase-user' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn()),
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

    await expect(
      syncUser(payload, 'firebase-1', 'firebase-token', vi.fn().mockResolvedValue('fresh-token')),
    ).rejects.toMatchObject({
      kind: 'auth',
      message: 'Your session has expired. Please sign in again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authMocks.logout).toHaveBeenCalledOnce();
  });
});
