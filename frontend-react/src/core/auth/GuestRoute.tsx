import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

export function RequireAnonymousRoute() {
  const status = useAuthStore((state) => state.status);

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

  if (status === 'authenticated') {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}

export const GuestRoute = RequireAnonymousRoute;
