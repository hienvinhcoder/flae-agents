import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';
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

describe('createApiClient', () => {
  it('joins URLs, attaches auth and workspace headers, and unwraps data', async () => {
    const harness = createFetchHarness(jsonResponse({ success: true, data: { id: 'item-1' } }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      tokenProvider: () => Promise.resolve('token-value'),
      fetchImpl: harness.fetchImpl,
    });

    await expect(
      client.request<{ id: string }>({ path: '/items', method: 'GET', workspaceId: 'workspace-1' }),
    ).resolves.toEqual({ id: 'item-1' });

    const request = harness.requests[0];
    expect(request?.url).toBe('https://api.example.test/items');
    expect(request?.headers.get('Accept')).toBe('application/json');
    expect(request?.headers.get('Authorization')).toBe('Bearer token-value');
    expect(request?.headers.get('X-Workspace-ID')).toBe('workspace-1');
  });

  it('omits token lookup and authorization for public requests', async () => {
    const harness = createFetchHarness(jsonResponse({ success: true, data: true }));
    const tokenProvider = vi.fn(() => Promise.resolve('token-value'));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: harness.fetchImpl,
    });

    await client.request({ path: '/health', method: 'GET', auth: false });

    expect(tokenProvider).not.toHaveBeenCalled();
    expect(harness.requests[0]?.headers.has('Authorization')).toBe(false);
  });

  it('sets JSON content type for JSON bodies but not FormData', async () => {
    const harness = createFetchHarness(
      jsonResponse({ success: true, data: true }),
      jsonResponse({ success: true, data: true }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    await client.request({ path: '/json', method: 'POST', body: { name: 'FLAE' } });
    const formData = new FormData();
    formData.set('title', 'Document');
    await client.request({ path: '/upload', method: 'POST', body: formData });

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
    const harness = createFetchHarness(
      jsonResponse({ success: false, data: null }, 401),
      jsonResponse({ success: true, data: { ok: true } }),
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

    await expect(client.request({ path: '/items', method: 'GET' })).resolves.toEqual({ ok: true });
    expect(tokenProvider).toHaveBeenNthCalledWith(1);
    expect(tokenProvider).toHaveBeenNthCalledWith(2, true);
    expect(tokenProvider).toHaveBeenCalledTimes(2);
    expect(harness.requests[1]?.headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('calls unauthorized once and stops after the retried request is also 401', async () => {
    const harness = createFetchHarness(
      jsonResponse({ success: false, data: null }, 401),
      jsonResponse({ success: false, data: null }, 401),
    );
    const tokenProvider = vi.fn(() => Promise.resolve('token'));
    const onUnauthorized = vi.fn();
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      onUnauthorized,
      fetchImpl: harness.fetchImpl,
    });

    const error = await client.request({ path: '/items', method: 'GET' }).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind: 'auth', status: 401, retryable: false });
    expect(harness.requests).toHaveLength(2);
    expect(tokenProvider).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
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
      return jsonResponse({ success: false, data: null }, 401);
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
    ['invalid envelope', jsonResponse({ data: { id: 'item-1' } })],
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

  it('normalizes an ordinary 4xx response without exposing its body', async () => {
    const sensitiveValue = 'Bearer private-token';
    const harness = createFetchHarness(
      jsonResponse(
        {
          success: false,
          data: { submittedSecret: sensitiveValue },
          message: `Access denied for ${sensitiveValue}`,
          code: `FORBIDDEN_${sensitiveValue}`,
        },
        403,
      ),
    );
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
  });
});
