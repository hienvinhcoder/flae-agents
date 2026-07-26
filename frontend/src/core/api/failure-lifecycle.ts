import { onlineManager } from '@tanstack/react-query';

export type ApiFailureNoticeKind = 'server' | 'session';

export interface ApiFailureNotice {
  id: number;
  kind: ApiFailureNoticeKind;
}

export interface ApiFailureSnapshot {
  connectionDown: boolean;
  notice: ApiFailureNotice | null;
  retrying: boolean;
}

interface ApiFailureConfiguration {
  onUnauthorized?: () => Promise<void> | void;
}

type Listener = () => void;

const initialSnapshot: ApiFailureSnapshot = {
  connectionDown: false,
  notice: null,
  retrying: false,
};

function createApiFailureLifecycle() {
  let snapshot = initialSnapshot;
  let configuration: ApiFailureConfiguration = {};
  let nextNoticeId = 1;
  const listeners = new Set<Listener>();
  let unauthorizedPromise: Promise<void> | null = null;

  const browserIsOnline = () => typeof navigator === 'undefined' || navigator.onLine;

  const publish = (next: ApiFailureSnapshot) => {
    onlineManager.setOnline(browserIsOnline() && !next.connectionDown);
    if (next === snapshot) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  onlineManager.setEventListener((setOnline) => {
    if (typeof window === 'undefined') return undefined;
    const syncBrowserConnection = () => {
      setOnline(browserIsOnline() && !snapshot.connectionDown);
    };
    window.addEventListener('online', syncBrowserConnection);
    window.addEventListener('offline', syncBrowserConnection);
    syncBrowserConnection();
    return () => {
      window.removeEventListener('online', syncBrowserConnection);
      window.removeEventListener('offline', syncBrowserConnection);
    };
  });
  onlineManager.setOnline(browserIsOnline() && !snapshot.connectionDown);

  return {
    configure(next: ApiFailureConfiguration) {
      configuration = next;
      return () => {
        if (configuration === next) configuration = {};
      };
    },
    dismissNotice() {
      if (snapshot.notice) publish({ ...snapshot, notice: null });
    },
    clearSessionNotice() {
      if (snapshot.notice?.kind === 'session') publish({ ...snapshot, notice: null });
    },
    getSnapshot: () => snapshot,
    isConnectionDown: () => snapshot.connectionDown,
    handleUnauthorized() {
      if (unauthorizedPromise) return unauthorizedPromise;
      if (snapshot.notice?.kind !== 'session') {
        publish({
          ...snapshot,
          notice: { id: nextNoticeId++, kind: 'session' },
        });
      }
      unauthorizedPromise = Promise.resolve(configuration.onUnauthorized?.()).finally(() => {
        unauthorizedPromise = null;
      });
      return unauthorizedPromise;
    },
    reportNetworkFailure() {
      if (!snapshot.connectionDown) publish({ ...snapshot, connectionDown: true });
    },
    reportRecovery() {
      if (snapshot.connectionDown || snapshot.retrying) {
        publish({ ...snapshot, connectionDown: false, retrying: false });
      }
    },
    reportServerFailure() {
      if (snapshot.notice?.kind === 'server') return;
      publish({
        ...snapshot,
        notice: { id: nextNoticeId++, kind: 'server' },
      });
    },
    reset() {
      configuration = {};
      nextNoticeId = 1;
      unauthorizedPromise = null;
      publish(initialSnapshot);
    },
    async retryConnection(probe: () => Promise<boolean>) {
      if (snapshot.retrying) return false;
      publish({ ...snapshot, retrying: true });
      try {
        const recovered = await probe();
        if (recovered) {
          publish({ ...snapshot, connectionDown: false, retrying: false });
          return true;
        }
      } catch {
        // The blocking dialog remains the only global signal for failed probes.
      }
      publish({ ...snapshot, connectionDown: true, retrying: false });
      return false;
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const apiFailureLifecycle = createApiFailureLifecycle();

export function isFailureBypassPath(path: string) {
  const normalized = path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  return normalized.endsWith('/health') || normalized.includes('/auth/sync');
}
