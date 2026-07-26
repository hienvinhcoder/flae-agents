import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useCallback, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { ConnectionDialog } from '../errors/ConnectionDialog';
import { AppError } from '../../core/api/errors';
import { probeBackendConnection } from '../../core/api/connection-probe';
import { apiFailureLifecycle } from '../../core/api/failure-lifecycle';
import { AuthBootstrap } from '../../core/auth/AuthBootstrap';
import { expireClientSession } from '../../core/auth/session-expiry';
import { useAuthStore } from '../../core/stores/auth-store';
import { Toast, ToastViewport } from '../../shared/ui/Toast';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          failureCount < 2 &&
          error instanceof AppError &&
          error.retryable &&
          (error.kind === 'network' || error.kind === 'server'),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function GlobalFailureUi({ queryClient }: { queryClient: QueryClient }) {
  const { t } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const failure = useSyncExternalStore(
    (listener) => apiFailureLifecycle.subscribe(listener),
    apiFailureLifecycle.getSnapshot,
    apiFailureLifecycle.getSnapshot,
  );

  useEffect(
    () => apiFailureLifecycle.configure({
      onUnauthorized: () => expireClientSession(queryClient),
    }),
    [queryClient],
  );

  useEffect(() => {
    const handleOffline = () => apiFailureLifecycle.reportNetworkFailure();
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') apiFailureLifecycle.clearSessionNotice();
  }, [authStatus]);

  const retry = useCallback(() => {
    void apiFailureLifecycle.retryConnection(probeBackendConnection);
  }, []);

  const noticeMessage = failure.notice?.kind === 'server'
    ? t('HTTP_ERROR.SERVER_ERROR_MESSAGE')
    : failure.notice?.kind === 'session'
      ? t('HTTP_ERROR.UNAUTHORIZED_MESSAGE')
      : null;

  return (
    <>
      <ConnectionDialog
        checking={failure.retrying}
        onRetry={retry}
        open={failure.connectionDown}
      />
      {noticeMessage ? (
        <ToastViewport>
          <Toast
            duration={failure.notice?.kind === 'session' ? 0 : undefined}
            message={noticeMessage}
            onDismiss={failure.notice?.kind === 'server'
              ? () => apiFailureLifecycle.dismissNotice()
              : undefined}
            tone="error"
          />
        </ToastViewport>
      ) : null}
    </>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
      <GlobalFailureUi queryClient={queryClient} />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
