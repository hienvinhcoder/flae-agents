import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiState } from './e2e/data';
import { fulfillJson, handleStream } from './e2e/fixtures';

afterEach(() => {
  vi.useRealTimers();
});

describe('E2E API fixtures', () => {
  it('reports a handled JSON route after fulfilling the response', async () => {
    const fulfill = vi.fn().mockResolvedValue(undefined);

    const handled = await fulfillJson({ fulfill } as never, { ok: true });

    expect(fulfill).toHaveBeenCalledOnce();
    expect(handled).toBe(true);
  });

  it('does not persist a stopped stream after its route has been cancelled', async () => {
    vi.useFakeTimers();
    const state = createApiState();
    const route = {
      abort: vi.fn(),
      fulfill: vi.fn().mockRejectedValue(new Error('Route was cancelled')),
    };

    const stream = handleStream(
      route as never,
      state,
      new URL('http://example.invalid/stream?message=Stop%20this%20response'),
    );
    await vi.advanceTimersByTimeAsync(1500);
    await stream;

    expect(state.messages).toEqual([]);
  });
});
