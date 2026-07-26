import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';
import { AppError } from './errors';
import { apiFailureLifecycle } from './failure-lifecycle';

type FetchStep = Response | Error | ((request: Request) => Response | Promise<Response>);

function createFetchHarness(...steps: FetchStep[]) {
  const requests: Request[] = [];
  let index = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const step = steps[index++];
    if (!step) throw new Error('Unexpected fetch call');
    if (step instanceof Error) throw step;
    return typeof step === 'function' ? step(request) : step;
  };
  return { fetchImpl, requests };
}

function dataResponse<T>(data: T | null, status = 200) {
  return new Response(JSON.stringify({
    code: String(status),
    data,
    message: status >= 400 ? 'Request failed' : 'Success',
  }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('createApiClient global failures', () => {
  beforeEach(() => apiFailureLifecycle.reset());

  it('normalizes offline failures and opens global recovery without leaking raw details', async () => {
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
    expect(apiFailureLifecycle.getSnapshot().connectionDown).toBe(true);
  });

  it('suppresses fetches while down but lets auth sync probe and close the dialog', async () => {
    apiFailureLifecycle.reportNetworkFailure();
    const harness = createFetchHarness(dataResponse({ id: 'user-1' }));
    const tokenProvider = vi.fn(() => Promise.resolve('token'));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider,
      fetchImpl: harness.fetchImpl,
    });

    await expect(client.request({ path: '/items', method: 'GET' })).resolves.toBeNull();
    await expect(client.request({ path: '/items', method: 'DELETE', response: 'void' })).resolves.toBeUndefined();
    expect(harness.requests).toHaveLength(0);
    expect(tokenProvider).not.toHaveBeenCalled();

    await expect(client.request({ path: '/auth/sync-user', method: 'POST', body: {} })).resolves.toEqual({ id: 'user-1' });
    expect(harness.requests).toHaveLength(1);
    expect(tokenProvider).toHaveBeenCalledOnce();
    expect(apiFailureLifecycle.getSnapshot().connectionDown).toBe(false);
  });

  it('publishes one server notice while preserving each local 5xx rejection', async () => {
    const harness = createFetchHarness(dataResponse(null, 500), dataResponse(null, 503));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve('token'),
      fetchImpl: harness.fetchImpl,
    });

    await expect(client.request({ path: '/items', method: 'GET' })).rejects.toMatchObject({ status: 500 });
    const firstNotice = apiFailureLifecycle.getSnapshot().notice;
    await expect(client.request({ path: '/other', method: 'GET' })).rejects.toMatchObject({ status: 503 });

    expect(firstNotice?.kind).toBe('server');
    expect(apiFailureLifecycle.getSnapshot().notice).toBe(firstNotice);
  });

  it('keeps failed health probes globally quiet while preserving the local error', async () => {
    apiFailureLifecycle.reportNetworkFailure();
    const harness = createFetchHarness(dataResponse(null, 503));
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve(null),
      fetchImpl: harness.fetchImpl,
    });

    await expect(client.request({ path: '/health', method: 'GET', auth: false })).rejects.toMatchObject({ status: 503 });
    expect(apiFailureLifecycle.getSnapshot()).toMatchObject({ connectionDown: true, notice: null });
  });

  it('runs dynamic global unauthorized cleanup for non-sync 401 only', async () => {
    const globalUnauthorized = vi.fn();
    apiFailureLifecycle.configure({ onUnauthorized: globalUnauthorized });
    const regular = createFetchHarness(dataResponse(null, 401), dataResponse(null, 401));
    const regularClient = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve('token'),
      fetchImpl: regular.fetchImpl,
    });

    await expect(regularClient.request({ path: '/items', method: 'GET' })).rejects.toMatchObject({ status: 401 });
    expect(globalUnauthorized).toHaveBeenCalledOnce();
    expect(apiFailureLifecycle.getSnapshot().notice?.kind).toBe('session');

    apiFailureLifecycle.dismissNotice();
    const sync = createFetchHarness(dataResponse(null, 401), dataResponse(null, 401));
    const scopedUnauthorized = vi.fn();
    const syncClient = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve('token'),
      onUnauthorized: scopedUnauthorized,
      fetchImpl: sync.fetchImpl,
    });
    await expect(syncClient.request({ path: '/auth/sync-user', method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });
    expect(scopedUnauthorized).toHaveBeenCalledOnce();
    expect(globalUnauthorized).toHaveBeenCalledOnce();
    expect(apiFailureLifecycle.getSnapshot().notice).toBeNull();
  });

  it('deduplicates global cleanup across concurrent exhausted 401 responses', async () => {
    let releaseCleanup!: () => void;
    const globalUnauthorized = vi.fn(() => new Promise<void>((resolve) => { releaseCleanup = resolve; }));
    apiFailureLifecycle.configure({ onUnauthorized: globalUnauthorized });
    const harness = createFetchHarness(
      dataResponse(null, 401), dataResponse(null, 401),
      dataResponse(null, 401), dataResponse(null, 401),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      tokenProvider: () => Promise.resolve('token'),
      fetchImpl: harness.fetchImpl,
    });

    const first = client.request({ path: '/first', method: 'GET' });
    const second = client.request({ path: '/second', method: 'GET' });
    await vi.waitFor(() => expect(globalUnauthorized).toHaveBeenCalledOnce());
    releaseCleanup();

    await expect(first).rejects.toMatchObject({ status: 401 });
    await expect(second).rejects.toMatchObject({ status: 401 });
    expect(globalUnauthorized).toHaveBeenCalledOnce();
  });
});
