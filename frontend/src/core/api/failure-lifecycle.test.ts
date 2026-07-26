import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFailureLifecycle } from './failure-lifecycle';

describe('apiFailureLifecycle query synchronization', () => {
  afterEach(() => apiFailureLifecycle.reset());

  it('deduplicates only in-flight unauthorized cleanup', async () => {
    let release!: () => void;
    const cleanup = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue(undefined);
    apiFailureLifecycle.configure({ onUnauthorized: cleanup });

    const first = apiFailureLifecycle.handleUnauthorized();
    const concurrent = apiFailureLifecycle.handleUnauthorized();
    expect(cleanup).toHaveBeenCalledOnce();
    release();
    await Promise.all([first, concurrent]);

    await apiFailureLifecycle.handleUnauthorized();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('pauses TanStack requests while down and restores online state on recovery', () => {
    apiFailureLifecycle.reportNetworkFailure();
    expect(onlineManager.isOnline()).toBe(false);

    apiFailureLifecycle.reportRecovery();
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('restores online state during test and application reset', () => {
    apiFailureLifecycle.reportNetworkFailure();
    apiFailureLifecycle.reset();

    expect(onlineManager.isOnline()).toBe(true);
    expect(apiFailureLifecycle.getSnapshot().connectionDown).toBe(false);
  });

  it('combines cold browser-offline state with backend connection state', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    onlineManager.setOnline(true);
    apiFailureLifecycle.reset();
    const unsubscribe = onlineManager.subscribe(() => undefined);

    expect(onlineManager.isOnline()).toBe(false);
    window.dispatchEvent(new Event('offline'));
    expect(onlineManager.isOnline()).toBe(false);

    unsubscribe();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
});
