import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';

import type { User } from '../../core/auth/user-schema';
import { useAuthStore } from '../../core/stores/auth-store';
import { useWorkspaceStore } from '../../core/stores/workspace-store';
import { useSelectWorkspace, useWorkspaces } from '../../features/settings/hooks/use-workspaces';
import type { Workspace } from '../../features/settings/types/workspace';
import { ErrorState } from '../../shared/ui/ErrorState';
import { AdminHeader, type LogoutController } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { findActiveNavigationItem, findNavigationGroup } from './admin-navigation';
import { useSidebarLayout } from './use-sidebar-layout';

export interface AppShellProps {
  fetchWorkspaces: () => Promise<Workspace[]>;
  logoutController?: LogoutController;
  syncSelection: (workspaceId: string) => Promise<User>;
}

export function AppShell({ fetchWorkspaces, logoutController, syncSelection }: AppShellProps) {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { layout: sidebarLayout, toggle: toggleSidebarLayout } = useSidebarLayout();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const syncStatus = useWorkspaceStore((state) => state.syncStatus);
  const clearSyncStatus = useWorkspaceStore((state) => state.clearSyncStatus);
  const user = useAuthStore((state) => state.user);
  const workspaces = useWorkspaces({ fetchWorkspaces, syncSelection });
  const selectWorkspace = useSelectWorkspace({ syncSelection });
  const activeItem = findActiveNavigationItem(location.pathname);
  const activeGroup = findNavigationGroup(activeItem);
  const pageLabel = activeItem ? t(activeItem.key) : 'FLAE';
  const sectionLabel = activeGroup ? t(activeGroup.key) : t('SHELL.BRAND_SUBTITLE');
  const openNavigation = useCallback(() => setNavigationOpen(true), []);
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);

  useEffect(() => {
    if (syncStatus !== 'success') return undefined;
    const timer = window.setTimeout(clearSyncStatus, 3000);
    return () => window.clearTimeout(timer);
  }, [clearSyncStatus, syncStatus]);

  const syncMessage = !workspaces.isSelectionInitialized
    ? t('SHELL.INITIALIZING')
    : syncStatus === 'syncing'
      ? t('SHELL.SYNCING')
      : syncStatus === 'success'
        ? t('SHELL.SYNC_SUCCESS')
        : syncStatus === 'error'
          ? t('SHELL.SYNC_ERROR')
          : null;

  return (
    <div className="glass-field min-h-screen bg-background text-foreground">
      <a className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-ui-control bg-primary-control px-4 py-2 font-semibold text-primary-control-foreground transition-transform duration-200 focus:translate-y-0" href="#main-content">{t('SHELL.SKIP_CONTENT')}</a>
      <AdminSidebar
        desktopLayout={sidebarLayout}
        mobileOpen={navigationOpen}
        onCloseMobile={closeNavigation}
        onToggleDesktop={toggleSidebarLayout}
      />

      <div className={`transition-[padding] duration-200 motion-reduce:transition-none md:pl-[72px] ${sidebarLayout === 'expanded' ? 'lg:pl-64' : 'lg:pl-[72px]'}`}>
        <AdminHeader
          currentWorkspaceId={currentWorkspaceId}
          language={i18n.resolvedLanguage ?? 'vi'}
          logoutController={logoutController}
          onChangeLanguage={(language) => void i18n.changeLanguage(language)}
          onOpenNavigation={openNavigation}
          onSelectWorkspace={(workspaceId) => void selectWorkspace(workspaceId).catch(() => undefined)}
          pageLabel={pageLabel}
          sectionLabel={sectionLabel}
          syncStatus={syncStatus}
          user={user}
          workspaces={workspaces.data ?? []}
          workspacesPending={workspaces.isPending}
        />

        {syncMessage ? <div aria-live="polite" className={`border-b px-4 py-2 text-sm md:px-6 xl:px-8 ${syncStatus === 'error' ? 'border-state-danger bg-state-danger-soft text-state-danger' : 'border-ui-divider bg-ui-raised text-ui-ink-secondary'}`} role="status">{syncMessage}</div> : null}
        {logoutController?.error ? <div className="border-b border-state-danger bg-state-danger-soft px-4 py-2 text-state-danger md:px-6 xl:px-8" role="alert">{t('SHELL.LOGOUT_ERROR')}</div> : null}

        <main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-5 md:px-6 md:py-6 xl:px-8" id="main-content" tabIndex={-1}>
          {workspaces.isError ? <ErrorState message={t('SHELL.LOAD_ERROR')} onRetry={() => void workspaces.refetch()} retryLabel={t('ERROR_PAGE.RETRY')} title={t('ERROR_PAGE.TITLE')} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
