import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'initializing' || status === 'syncing') {
    return (
      <div
        aria-label="Checking your session"
        className="flex min-h-screen items-center justify-center bg-ui-canvas text-ui-ink-secondary"
        role="status"
      >
        <span className="h-2 w-48 animate-pulse rounded-full bg-brand-soft" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    const requestedUrl = `${location.pathname}${location.search}${location.hash}`;
    const search = new URLSearchParams({ returnUrl: requestedUrl });
    return <Navigate replace to={`/auth/login?${search.toString()}`} />;
  }

  return <Outlet />;
}
