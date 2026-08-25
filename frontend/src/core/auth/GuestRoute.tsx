import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';
import { safeReturnUrl } from './return-url';

export function RequireAnonymousRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'initializing' || status === 'syncing') {
    return (
      <div
        aria-label="Checking your session"
        className="glass-field flex min-h-screen items-center justify-center text-glass-ink-secondary"
        role="status"
      >
        <span className="h-2 w-48 animate-pulse rounded-full bg-brand-soft" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (status === 'authenticated') {
    const returnUrl = new URLSearchParams(location.search).get('returnUrl');
    return <Navigate replace to={safeReturnUrl(returnUrl)} />;
  }

  return <Outlet />;
}

export const GuestRoute = RequireAnonymousRoute;
