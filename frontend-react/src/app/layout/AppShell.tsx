import {
  Bot, BookOpen, ChevronDown, FileText, Inbox, LogOut, Menu, MessageSquare,
  Network, Settings, Sparkles, Tags, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { ConnectionDialog } from '../errors/ConnectionDialog';
import type { User } from '../../core/auth/user-schema';
import { useAuthStore } from '../../core/stores/auth-store';
import { useWorkspaceStore } from '../../core/stores/workspace-store';
import type { Workspace } from '../../features/settings/types/workspace';
import { useSelectWorkspace, useWorkspaces } from '../../features/settings/hooks/use-workspaces';
import { Button } from '../../shared/ui/Button';
import { ErrorState } from '../../shared/ui/ErrorState';
import { Skeleton } from '../../shared/ui/Skeleton';
import { ToastViewport } from '../../shared/ui/Toast';

export interface AppShellProps {
  fetchWorkspaces: () => Promise<Workspace[]>;
  logoutController?: {
    error: string | null;
    isLoading: boolean;
    logout: () => Promise<void>;
  };
  syncSelection: (workspaceId: string) => Promise<User>;
}

interface NavigationItem {
  icon: typeof Sparkles;
  key: string;
  label?: string;
  to: string;
}

const navigation: readonly NavigationItem[] = [
  { icon: Sparkles, key: 'NAV.BRIEFING', to: '/dashboard/briefing' },
  { icon: MessageSquare, key: 'NAV.CHAT', to: '/dashboard/chat' },
  { icon: Inbox, key: 'NAV.INBOX', to: '/dashboard/inbox' },
  { icon: Bot, key: 'NAV.AGENTS', to: '/dashboard/agents' },
  { icon: BookOpen, key: 'NAV.KNOWLEDGE', to: '/dashboard/knowledge' },
  { icon: Network, key: 'SHELL.KNOWLEDGE_GRAPH', to: '/dashboard/knowledge/graph' },
  { icon: Tags, key: 'NAV.TOPICS', to: '/dashboard/topics' },
  { icon: FileText, key: 'NAV.REPORTS', to: '/dashboard/reports' },
  { icon: Settings, key: 'NAV.SETTINGS', to: '/dashboard/settings' },
] as const;

export function AppShell({ fetchWorkspaces, logoutController, syncSelection }: AppShellProps) {
  const { i18n, t } = useTranslation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const syncStatus = useWorkspaceStore((state) => state.syncStatus);
  const clearSyncStatus = useWorkspaceStore((state) => state.clearSyncStatus);
  const user = useAuthStore((state) => state.user);
  const workspaces = useWorkspaces({ fetchWorkspaces, syncSelection });
  const selectWorkspace = useSelectWorkspace({ syncSelection });

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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
    <div className="min-h-screen bg-ui-canvas text-ui-ink">
      <a className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-ui-control bg-brand px-4 py-2 font-semibold text-brand-foreground transition-transform duration-200 focus:translate-y-0" href="#main-content">{t('SHELL.SKIP_CONTENT')}</a>
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-ui-line bg-ui-panel p-4 transition-transform duration-200 md:translate-x-0 ${navigationOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex min-h-12 items-center justify-between">
          <NavLink className="flex items-center gap-3 text-ui-ink no-underline" to="/dashboard/briefing">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-ui-control bg-brand font-bold text-brand-foreground">F</span>
            <span><strong className="block tracking-[0.16em]">FLAE</strong><small className="text-ui-ink-muted">{t('SHELL.BRAND_SUBTITLE')}</small></span>
          </NavLink>
          <button aria-label={t('SHELL.CLOSE_NAV')} className="grid min-h-10 min-w-10 place-items-center rounded-ui-control text-ui-ink-secondary hover:bg-ui-interactive md:hidden" onClick={() => setNavigationOpen(false)} type="button"><X aria-hidden className="h-5 w-5" /></button>
        </div>

        <nav aria-label={t('SHELL.PRIMARY_NAV')} className="mt-8 grid gap-1">
          {navigation.map(({ icon: Icon, key, label, to }) => (
            <NavLink
              className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-ui-control px-3 py-2 font-medium no-underline transition-colors duration-200 ${isActive ? 'bg-brand-soft text-ui-ink' : 'text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink'}`}
              end
              key={to}
              onClick={() => setNavigationOpen(false)}
              to={to}
            >
              <Icon aria-hidden className="h-5 w-5 shrink-0" />
              <span>{label ?? t(key)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {navigationOpen ? <button aria-label={t('SHELL.CLOSE_NAV_OVERLAY')} className="fixed inset-0 z-30 bg-ui-canvas/80 md:hidden" onClick={() => setNavigationOpen(false)} type="button" /> : null}

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-ui-divider bg-ui-canvas/95 px-4 py-2 backdrop-blur md:px-6 xl:px-8">
          <button aria-label={t('SHELL.OPEN_NAV')} className="grid min-h-11 min-w-11 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink transition-colors duration-200 hover:bg-ui-interactive md:hidden" onClick={() => setNavigationOpen(true)} type="button"><Menu aria-hidden className="h-5 w-5" /></button>

          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <label className="sr-only" htmlFor="workspace-selector">{t('SHELL.WORKSPACE')}</label>
            {workspaces.isPending ? <Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} /> : (
              <><select
                className="min-h-11 w-full appearance-none truncate rounded-ui-control border border-ui-line bg-ui-raised px-3 pr-9 text-ui-ink transition-colors duration-200 hover:border-ui-line-strong"
                disabled={!workspaces.data?.length || syncStatus === 'syncing'}
                id="workspace-selector"
                onChange={(event) => void selectWorkspace(event.target.value).catch(() => undefined)}
                value={currentWorkspaceId ?? ''}
              >
                {!workspaces.data?.length ? <option value="">{t('SHELL.NO_WORKSPACE')}</option> : null}
                {workspaces.data?.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select><ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-ui-ink-muted" /></>
            )}
          </div>

          <label className="sr-only" htmlFor="language-selector">{t('COMMON.LANGUAGE')}</label>
          <select aria-label={t('COMMON.LANGUAGE')} className="min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 text-ui-ink" id="language-selector" onChange={(event) => void i18n.changeLanguage(event.target.value)} value={i18n.resolvedLanguage ?? 'vi'}><option value="vi">VI</option><option value="en">EN</option></select>

          <div className="hidden min-w-0 sm:block"><p className="truncate font-semibold text-ui-ink">{user?.full_name}</p><p className="truncate text-xs text-ui-ink-muted">{user?.email}</p></div>
          {logoutController ? <Button aria-label={t('COMMON.LOGOUT')} className="min-w-11 px-3" isLoading={logoutController.isLoading} loadingText={t('SHELL.LOGGING_OUT')} onClick={() => void logoutController.logout()} variant="ghost"><LogOut aria-hidden className="h-5 w-5" /><span className="sr-only sm:not-sr-only">{t('COMMON.LOGOUT')}</span></Button> : null}
        </header>

        {syncMessage ? <div aria-live="polite" className={`border-b px-4 py-2 text-sm md:px-6 xl:px-8 ${syncStatus === 'error' ? 'border-state-danger bg-state-danger-soft text-state-danger' : 'border-ui-divider bg-ui-raised text-ui-ink-secondary'}`} role="status">{syncMessage}</div> : null}
        {logoutController?.error ? <div className="border-b border-state-danger bg-state-danger-soft px-4 py-2 text-state-danger md:px-6 xl:px-8" role="alert">{t('SHELL.LOGOUT_ERROR')}</div> : null}

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6 xl:p-8" id="main-content" tabIndex={-1}>
          {workspaces.isError ? <ErrorState message={t('SHELL.LOAD_ERROR')} onRetry={() => void workspaces.refetch()} retryLabel={t('ERROR_PAGE.RETRY')} title={t('ERROR_PAGE.TITLE')} /> : <Outlet />}
        </main>
      </div>

      <ToastViewport />
      <ConnectionDialog onRetry={() => setOffline(!navigator.onLine)} open={offline} />
    </div>
  );
}
