import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/env', () => ({
  env: { VITE_API_URL: 'https://api.example.test/api/v1/' },
}));

import { probeBackendConnection } from './connection-probe';

describe('probeBackendConnection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the public health endpoint and reports an HTTP recovery', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"status":"ok"}'));

    await expect(probeBackendConnection({ fetchImpl })).resolves.toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.test/api/v1/health');
    expect(init?.headers).toEqual({ Accept: 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps non-successful health responses local to the retry dialog', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(probeBackendConnection({ fetchImpl })).resolves.toBe(false);
  });

  it('aborts a hanging health request after a bounded timeout and clears its timer', async () => {
    let abortRequest!: () => void;
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        abortRequest = () => reject(new DOMException('Timed out', 'AbortError'));
        abortRequest();
      });
    }));
    const clearTimeoutImpl = vi.fn();
    const setTimeoutImpl = vi.fn((callback: () => void) => {
      callback();
      return 42;
    });

    await expect(probeBackendConnection({
      clearTimeoutImpl,
      fetchImpl,
      setTimeoutImpl,
      timeoutMs: 250,
    })).resolves.toBe(false);
    expect(setTimeoutImpl).toHaveBeenCalledWith(expect.any(Function), 250);
    expect(clearTimeoutImpl).toHaveBeenCalledWith(42);
  });
});
