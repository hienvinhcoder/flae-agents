export interface WebSocketLike extends EventTarget {
  readonly readyState: number;
  close(code?: number, reason?: string): void;
}

interface WebSocketConstructor {
  new (url: string | URL): WebSocketLike;
}

export interface ManagedWebSocketHandle {
  readonly scope: string;
  readonly socket: WebSocketLike | null;
  readonly url: string;
  disconnect(): void;
}

export interface ManagedWebSocketHandlers {
  onClose?: (event: CloseEvent, handle: ManagedWebSocketHandle) => void;
  onError?: (event: Event, handle: ManagedWebSocketHandle) => void;
  onMessage?: (event: MessageEvent, handle: ManagedWebSocketHandle) => void;
  onOpen?: (event: Event, handle: ManagedWebSocketHandle) => void;
}

export interface WebSocketManagerOptions {
  WebSocketImpl?: WebSocketConstructor;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  maxRetries?: number;
}

interface SocketEntry {
  cleanupSocket?: () => void;
  handle: ManagedWebSocketHandle;
  handlers: ManagedWebSocketHandlers;
  requested: boolean;
  retryCount: number;
  retryTimer?: number;
  socket: WebSocketLike | null;
  url: string;
}

const AUTH_CLOSE_CODE = 1008;

function isAuthFailure(event: CloseEvent) {
  return event.code === AUTH_CLOSE_CODE || /auth|token|credential/i.test(event.reason);
}

export function createWebSocketManager({
  WebSocketImpl = WebSocket,
  baseRetryDelayMs = 1_000,
  maxRetryDelayMs = 30_000,
  maxRetries = 5,
}: WebSocketManagerOptions = {}) {
  const entries = new Map<string, SocketEntry>();
  let onlineListenerAttached = false;

  const removeOnlineListenerIfIdle = () => {
    if (entries.size === 0 && onlineListenerAttached) {
      window.removeEventListener('online', handleOnline);
      onlineListenerAttached = false;
    }
  };

  const removeEntry = (scope: string, entry: SocketEntry) => {
    if (entries.get(scope) !== entry) return;
    entries.delete(scope);
    removeOnlineListenerIfIdle();
  };

  const scheduleRetry = (scope: string, entry: SocketEntry) => {
    if (!entry.requested || entries.get(scope) !== entry) return;
    if (!navigator.onLine || entry.retryCount >= maxRetries) return;

    const delay = Math.min(baseRetryDelayMs * 2 ** entry.retryCount, maxRetryDelayMs);
    entry.retryCount += 1;
    entry.retryTimer = window.setTimeout(() => {
      entry.retryTimer = undefined;
      openSocket(scope, entry);
    }, delay);
  };

  const openSocket = (scope: string, entry: SocketEntry) => {
    if (!entry.requested || entries.get(scope) !== entry || !navigator.onLine) return;

    let socket: WebSocketLike;
    try {
      socket = new WebSocketImpl(entry.url);
    } catch {
      entry.socket = null;
      scheduleRetry(scope, entry);
      return;
    }
    entry.socket = socket;

    const handleOpen = (event: Event) => {
      if (entry.socket !== socket) return;
      entry.retryCount = 0;
      entry.handlers.onOpen?.(event, entry.handle);
    };
    const handleMessage = (event: Event) => {
      if (entry.socket === socket) entry.handlers.onMessage?.(event as MessageEvent, entry.handle);
    };
    const handleError = (event: Event) => {
      if (entry.socket === socket) entry.handlers.onError?.(event, entry.handle);
    };
    const handleClose = (rawEvent: Event) => {
      if (entry.socket !== socket) return;
      const event = rawEvent as CloseEvent;
      entry.cleanupSocket?.();
      entry.cleanupSocket = undefined;
      entry.socket = null;
      try {
        entry.handlers.onClose?.(event, entry.handle);
      } catch {
        // Consumer failures must not interrupt connection bookkeeping.
      }
      if (!entry.requested) return;
      if (isAuthFailure(event)) {
        entry.requested = false;
        removeEntry(scope, entry);
        return;
      }
      scheduleRetry(scope, entry);
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('error', handleError);
    socket.addEventListener('close', handleClose);
    entry.cleanupSocket = () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('error', handleError);
      socket.removeEventListener('close', handleClose);
    };
  };

  function handleOnline() {
    entries.forEach((entry, scope) => {
      if (!entry.requested || entry.socket || entry.retryTimer !== undefined) return;
      openSocket(scope, entry);
    });
  }

  const ensureOnlineListener = () => {
    if (onlineListenerAttached) return;
    window.addEventListener('online', handleOnline);
    onlineListenerAttached = true;
  };

  const disconnectEntry = (scope: string, entry: SocketEntry) => {
    if (entries.get(scope) !== entry) return;
    entry.requested = false;
    if (entry.retryTimer !== undefined) window.clearTimeout(entry.retryTimer);
    entry.cleanupSocket?.();
    entry.socket?.close(1000, 'client disconnect');
    entry.socket = null;
    removeEntry(scope, entry);
  };

  const connect = (scope: string, url: string, handlers: ManagedWebSocketHandlers = {}) => {
    const existing = entries.get(scope);
    if (existing?.requested && existing.url === url) {
      existing.handlers = handlers;
      return existing.handle;
    }
    if (existing) disconnectEntry(scope, existing);

    const entry = {
      handlers,
      requested: true,
      retryCount: 0,
      socket: null,
      url,
    } as SocketEntry;
    entry.handle = {
      disconnect: () => disconnectEntry(scope, entry),
      get scope() { return scope; },
      get socket() { return entry.socket; },
      get url() { return entry.url; },
    };
    entries.set(scope, entry);
    ensureOnlineListener();
    openSocket(scope, entry);
    return entry.handle;
  };

  return {
    connect,
    disconnect(scope: string) {
      const entry = entries.get(scope);
      if (entry) disconnectEntry(scope, entry);
    },
    disconnectAll() {
      [...entries.entries()].forEach(([scope, entry]) => disconnectEntry(scope, entry));
    },
  };
}

export const webSocketManager = createWebSocketManager();
