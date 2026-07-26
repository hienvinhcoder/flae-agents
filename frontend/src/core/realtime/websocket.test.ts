import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebSocketManager } from './websocket';

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent('close', { code, reason }));
  });

  constructor(url: string | URL) {
    super();
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  fail(code = 1006, reason = '') {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent('close', { code, reason }));
  }
}

describe('WebSocket manager', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.useRealTimers();
  });

  it('stays dormant until requested and keeps one active socket per scope', () => {
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket });

    expect(FakeWebSocket.instances).toHaveLength(0);
    const first = manager.connect('notifications', 'wss://example.test/events');
    const duplicate = manager.connect('notifications', 'wss://example.test/events');

    expect(duplicate).toBe(first);
    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.disconnectAll();
  });

  it('cleans up a scope and never reconnects after an intentional disconnect', () => {
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket });
    const handle = manager.connect('notifications', 'wss://example.test/events');
    const socket = handle.socket as FakeWebSocket;

    manager.disconnect('notifications');
    vi.runAllTimers();

    expect(socket.close).toHaveBeenCalledOnce();
    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.disconnectAll();
  });

  it('uses bounded exponential retry without adding duplicate online listeners', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const manager = createWebSocketManager({
      WebSocketImpl: FakeWebSocket,
      baseRetryDelayMs: 100,
      maxRetries: 2,
    });
    manager.connect('notifications', 'wss://example.test/events');
    manager.connect('activity', 'wss://example.test/activity');

    FakeWebSocket.instances[0]?.fail();
    vi.advanceTimersByTime(99);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    FakeWebSocket.instances[2]?.fail();
    vi.advanceTimersByTime(199);
    expect(FakeWebSocket.instances).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(4);

    FakeWebSocket.instances[3]?.fail();
    vi.runAllTimers();
    expect(FakeWebSocket.instances).toHaveLength(4);
    expect(addEventListener.mock.calls.filter(([type]) => type === 'online')).toHaveLength(1);

    manager.disconnectAll();
    addEventListener.mockRestore();
  });

  it('does not retry policy/auth failures', () => {
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket, baseRetryDelayMs: 10 });
    manager.connect('notifications', 'wss://example.test/events');

    FakeWebSocket.instances[0]?.fail(1008, 'authentication required');
    vi.runAllTimers();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('waits while offline and reconnects once when the browser returns online', () => {
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket, baseRetryDelayMs: 10 });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    manager.connect('notifications', 'wss://example.test/events');

    expect(FakeWebSocket.instances).toHaveLength(0);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('online'));

    expect(FakeWebSocket.instances).toHaveLength(1);
    manager.disconnectAll();
  });

  it('keeps one managed handle and forwards handlers after a replacement socket opens', () => {
    const onMessage = vi.fn();
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket, baseRetryDelayMs: 10 });
    const handle = manager.connect('notifications', 'wss://example.test/events', { onMessage });

    FakeWebSocket.instances[0]?.fail();
    vi.advanceTimersByTime(10);
    const replacement = FakeWebSocket.instances[1];
    replacement?.dispatchEvent(new MessageEvent('message', { data: 'recovered-event' }));

    expect(manager.connect('notifications', 'wss://example.test/events', { onMessage })).toBe(handle);
    expect(handle.socket).toBe(replacement);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ data: 'recovered-event' }), handle);
    handle.disconnect();
  });

  it('recovers from a synchronous constructor failure without throwing to the consumer', () => {
    let attempts = 0;
    class FlakyWebSocket extends FakeWebSocket {
      constructor(url: string | URL) {
        attempts += 1;
        if (attempts === 1) throw new Error('private constructor failure');
        super(url);
      }
    }
    const manager = createWebSocketManager({ WebSocketImpl: FlakyWebSocket, baseRetryDelayMs: 10 });

    const handle = manager.connect('notifications', 'wss://example.test/events');
    expect(handle.socket).toBeNull();
    vi.advanceTimersByTime(10);
    expect(handle.socket).toBe(FakeWebSocket.instances[0]);
    handle.disconnect();
  });

  it('retries even when a consumer close handler throws', () => {
    const onClose = vi.fn(() => { throw new Error('consumer close failure'); });
    const manager = createWebSocketManager({ WebSocketImpl: FakeWebSocket, baseRetryDelayMs: 10 });
    const handle = manager.connect('notifications', 'wss://example.test/events', { onClose });

    expect(() => FakeWebSocket.instances[0]?.fail()).not.toThrow();
    vi.advanceTimersByTime(10);

    expect(onClose).toHaveBeenCalledOnce();
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(handle.socket).toBe(FakeWebSocket.instances[1]);
    handle.disconnect();
  });
});
