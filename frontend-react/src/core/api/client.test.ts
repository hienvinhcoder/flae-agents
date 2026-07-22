import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createApiClient, type RequestBody } from './client';
import { AppError } from './errors';

type FetchStep = Response | Error | DOMException | ((request: Request) => Response | Promise<Response>);

function createFetchHarness(...steps: FetchStep[]) {
  const requests: Request[] = [];
  let index = 0;

  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const step = steps[index++];

    if (!step) {
      throw new Error('Unexpected fetch call');
    }
    if (step instanceof Error || step instanceof DOMException) {
      throw step;
    }
    return typeof step === 'function' ? step(request) : step;
  };

  return { fetchImpl, requests };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dataResponse<T>(data: T | null, status = 200) {
  return jsonResponse(
    {
      code: String(status),
      message: status >= 400 ? 'Request failed' : 'Success',
      data,
    },
    status,
  );
}

describe('createApiClient', () => {
  it('joins URLs, attaches auth and workspace headers, and unwraps data', async () => {
    const harness = createFetchHarness(dataResponse({ id: 'item-1' }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      tokenProvider: () => Promise.resolve('token-value'),
      fetchImpl: harness.fetchImpl,
    });

    const result = client.request<{ id: string }>({
      path: '/items',
      method: 'GET',
      workspaceId: 'workspace-1',
    });
    expectTypeOf(result).toEqualTypeOf<Promise<{ id: string } | null>>();
    await expect(result).resolves.toEqual({ id: 'item-1' });

    const request = harness.requests[0];
    expect(request?.url).toBe('https://api.example.test/items');
    expect(request?.headers.get('Accept')).toBe('application/json');
    expect(request?.headers.get('Authorization')).toBe('Bearer token-value');
    expect(request?.headers.get('X-Workspace-ID')).toBe('workspace-1');
  });

  it('omits token lookup and authorization for public requests', async () => {
    const harness = createFetchHarness(dataResponse(true));
    const tokenProvider = vi.fn(() => Promise.resolve('token-value'));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: harness.fetchImpl,
    });

    await client.request({
      path: '/health',
      method: 'GET',
      auth: false,
      headers: {
        Authorization: 'Bearer caller-token',
        'X-Workspace-ID': 'caller-workspace',
      },
    });

    expect(tokenProvider).not.toHaveBeenCalled();
    expect(harness.requests[0]?.headers.has('Authorization')).toBe(false);
    expect(harness.requests[0]?.headers.has('X-Workspace-ID')).toBe(false);
  });

  it('sets JSON content type for JSON bodies but not FormData', async () => {
    const harness = createFetchHarness(
      dataResponse(true),
      dataResponse(true),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    await client.request({ path: '/json', method: 'POST', body: { name: 'FLAE' } });
    const formData = new FormData();
    formData.set('title', 'Document');
    await client.request({
      path: '/upload',
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(harness.requests[0]?.headers.get('Content-Type')).toBe('application/json');
    expect(harness.requests[1]?.headers.get('Content-Type')).toContain('multipart/form-data');
    expect(harness.requests[1]?.headers.get('Content-Type')).not.toBe('application/json');
  });

  it('normalizes offline network failures without leaking the raw message', async () => {
    const harness = createFetchHarness(new TypeError('failed token=secret-value'));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'network', retryable: true });
    expect((error as Error).message).not.toContain('secret-value');
    expect(String((error as Error).cause)).not.toContain('secret-value');
  });

  it('refreshes the token exactly once after a first authenticated 401', async () => {
    const firstUnauthorizedResponse = dataResponse(null, 401);
    const harness = createFetchHarness(
      firstUnauthorizedResponse,
      dataResponse({ ok: true }),
    );
    const tokenProvider = vi
      .fn<(forceRefresh?: boolean) => Promise<string | null>>()
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: harness.fetchImpl,
    });

    await expect(
      client.request({
        path: '/items',
        method: 'GET',
        workspaceId: 'managed-workspace',
        headers: {
          Authorization: 'Bearer caller-token',
          'X-Workspace-ID': 'caller-workspace',
        },
      }),
    ).resolves.toEqual({ ok: true });
    expect(tokenProvider).toHaveBeenNthCalledWith(1);
    expect(tokenProvider).toHaveBeenNthCalledWith(2, true);
    expect(tokenProvider).toHaveBeenCalledTimes(2);
    expect(harness.requests[0]?.headers.get('Authorization')).toBe('Bearer expired-token');
    expect(harness.requests[1]?.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(harness.requests[0]?.headers.get('X-Workspace-ID')).toBe('managed-workspace');
    expect(harness.requests[1]?.headers.get('X-Workspace-ID')).toBe('managed-workspace');
    expect(firstUnauthorizedResponse.bodyUsed).toBe(true);
  });

  it('calls unauthorized once and stops after the retried request is also 401', async () => {
    const harness = createFetchHarness(
      dataResponse(null, 401),
      dataResponse(null, 401),
    );
    const tokenProvider = vi.fn(() => Promise.resolve('token'));
    const onUnauthorized = vi.fn(() => Promise.reject(new Error('cleanup leaked private-token')));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      onUnauthorized,
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      kind: 'auth',
      status: 401,
      retryable: false,
      code: 'AUTH_CLEANUP_FAILED',
    });
    expect(harness.requests).toHaveLength(2);
    expect(tokenProvider).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect((error as Error).message).not.toContain('private-token');
    expect(String((error as Error).cause)).not.toContain('private-token');
  });

  it('normalizes token-provider failures without exposing token or PII', async () => {
    const sensitiveValue = 'person@example.test private-token';
    const tokenProvider = vi.fn(() => Promise.reject(new Error(sensitiveValue)));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: createFetchHarness(dataResponse(true)).fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'auth', retryable: false });
    expect((error as Error).message).not.toContain(sensitiveValue);
    expect(String((error as Error).cause)).not.toContain(sensitiveValue);
  });

  it('preserves abort classification when token lookup aborts', async () => {
    const tokenProvider = vi.fn(() =>
      Promise.reject(new DOMException('person@example.test private-token', 'AbortError')),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: createFetchHarness(dataResponse(true)).fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'network', retryable: false });
    expect((error as Error).message).toBe('The request was cancelled.');
  });

  it('normalizes invalid caller headers as a safe validation error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: createFetchHarness(dataResponse(true)).fetchImpl,
    });

    const error = await client
      .request({ path: '/items', method: 'GET', headers: { 'Invalid\nprivate-token': 'PII' } })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation', retryable: false });
    expect((error as Error).message).not.toContain('private-token');
    expect(String((error as Error).cause)).not.toContain('private-token');
  });

  it('normalizes JSON serialization failures as a safe validation error', async () => {
    const cyclicBody: Record<string, unknown> = {};
    cyclicBody.self = cyclicBody;
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: createFetchHarness(dataResponse(true)).fetchImpl,
    });

    const error = await client
      .request({ path: '/items', method: 'POST', body: cyclicBody as RequestBody })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation', retryable: false });
    expect((error as Error).message).not.toContain('cyclic');
  });

  it('normalizes aborts and never retries them', async () => {
    const abortError = new DOMException('request body included a secret', 'AbortError');
    const harness = createFetchHarness(abortError);
    const tokenProvider = vi.fn(() => Promise.resolve('token'));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: harness.fetchImpl,
    });

    const error = await client
      .request({ path: '/items', method: 'GET', signal: new AbortController().signal })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind: 'network', retryable: false });
    expect((error as Error).message).not.toContain('secret');
    expect(harness.requests).toHaveLength(1);
    expect(tokenProvider).toHaveBeenCalledTimes(1);
  });

  it('does not refresh or sign out when the signal is aborted after a 401', async () => {
    const controller = new AbortController();
    const harness = createFetchHarness(() => {
      controller.abort();
      return dataResponse(null, 401);
    });
    const tokenProvider = vi.fn(() => Promise.resolve('token'));
    const onUnauthorized = vi.fn();
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      onUnauthorized,
      fetchImpl: harness.fetchImpl,
    });

    const error = await client
      .request({ path: '/items', method: 'GET', signal: controller.signal })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind: 'network', retryable: false });
    expect(harness.requests).toHaveLength(1);
    expect(tokenProvider).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid JSON', new Response('{broken', { status: 200 })],
    ['missing code', jsonResponse({ message: 'Success', data: { id: 'item-1' } })],
    ['missing message', jsonResponse({ code: '200', data: { id: 'item-1' } })],
    ['missing data', jsonResponse({ code: '200', message: 'Success' })],
  ])('normalizes a successful response with %s', async (_caseName, response) => {
    const harness = createFetchHarness(response);
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'server', retryable: false });
  });

  it.each([
    [422, 'validation', false],
    [500, 'server', true],
  ] as const)('normalizes HTTP %i as %s with retryable=%s', async (status, kind, retryable) => {
    const harness = createFetchHarness(jsonResponse({ secret: 'must-not-leak' }, status));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind, status, retryable });
    expect((error as Error).message).not.toContain('must-not-leak');
  });

  it('preserves nullable data from the backend envelope', async () => {
    const harness = createFetchHarness(dataResponse(null));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    await expect(client.request<{ id: string }>({ path: '/items', method: 'GET' })).resolves.toBeNull();
  });

  it.each([204, 205])('returns undefined for an explicit void response with HTTP %i', async (status) => {
    const harness = createFetchHarness(new Response(null, { status }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    const result = client.request({ path: '/items', method: 'DELETE', response: 'void' });
    expectTypeOf(result).toEqualTypeOf<Promise<void>>();
    await expect(result).resolves.toBeUndefined();
  });

  it.each([204, 205])('rejects HTTP %i as an invalid data response', async (status) => {
    const harness = createFetchHarness(new Response(null, { status }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    const error = await client
      .request<{ id: string }>({ path: '/items', method: 'GET' })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'server', status, retryable: false });
    expect((error as Error).message).toBe('The server returned an invalid response.');
  });

  it('normalizes an ordinary 4xx response without exposing its body', async () => {
    const sensitiveValue = 'Bearer private-token';
    const forbiddenResponse = jsonResponse(
      {
        data: { submittedSecret: sensitiveValue },
        message: `Access denied for ${sensitiveValue}`,
        code: `FORBIDDEN_${sensitiveValue}`,
      },
      403,
    );
    const harness = createFetchHarness(forbiddenResponse);
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve('private-token'),
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation', status: 403, retryable: false });
    expect((error as AppError).code).toBeUndefined();
    expect((error as Error).message).not.toContain(sensitiveValue);
    expect(String((error as Error).cause)).not.toContain(sensitiveValue);
    expect(forbiddenResponse.bodyUsed).toBe(true);
  });

  it('preserves the primary HTTP error when response disposal fails', async () => {
    const response = new Response(
      new ReadableStream({
        cancel: () => {
          throw new Error('disposal leaked private-token');
        },
      }),
      { status: 403 },
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: createFetchHarness(response).fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ kind: 'validation', status: 403, retryable: false });
    expect((error as Error).message).not.toContain('private-token');
  });
});
