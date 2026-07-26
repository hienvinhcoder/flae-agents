import { env } from '../config/env';

interface ConnectionProbeOptions {
  clearTimeoutImpl?: (timer: number) => void;
  fetchImpl?: typeof fetch;
  setTimeoutImpl?: (callback: () => void, timeoutMs: number) => number;
  timeoutMs?: number;
}

function healthUrl() {
  return `${env.VITE_API_URL.replace(/\/+$/, '')}/health`;
}

export async function probeBackendConnection({
  clearTimeoutImpl = (timer) => window.clearTimeout(timer),
  fetchImpl = fetch,
  setTimeoutImpl = (callback, timeoutMs) => window.setTimeout(callback, timeoutMs),
  timeoutMs = 5_000,
}: ConnectionProbeOptions = {}) {
  const controller = new AbortController();
  let timer: number | undefined;
  let response: Response | undefined;
  try {
    const request = fetchImpl(healthUrl(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    timer = setTimeoutImpl(() => controller.abort(), timeoutMs);
    response = await request;
    return response.ok;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeoutImpl(timer);
    try {
      await response?.body?.cancel();
    } catch {
      // A failed disposal must not turn a successful health probe into failure.
    }
  }
}
