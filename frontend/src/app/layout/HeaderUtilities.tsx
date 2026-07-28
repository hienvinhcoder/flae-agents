import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import type { LogoutController, WorkspaceSyncStatus } from './AdminHeader';

export interface HeaderUtilitiesProps {
  currentWorkspaceId: string | null;
  language: string;
  logoutController?: LogoutController;
  onChangeLanguage: (language: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  syncStatus: WorkspaceSyncStatus;
  user: User | null;
  workspaces: Workspace[];
  workspacesPending: boolean;
}

function userInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U'
  );
}

export function HeaderUtilities({
  currentWorkspaceId,
  language,
  logoutController,
  onChangeLanguage,
  onSelectWorkspace,
  syncStatus,
  user,
  workspaces,
  workspacesPending,
}: HeaderUtilitiesProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative w-32 sm:w-40 xl:w-52">
        <label className="sr-only" htmlFor="admin-header-workspace">
          {t('SHELL.WORKSPACE')}
        </label>
        {workspacesPending ? (
          <div className="flex min-h-10 items-center rounded-ui-control border border-ui-divider bg-ui-raised px-3">
            <Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} />
          </div>
        ) : (
          <>
            <select
              className="min-h-10 w-full appearance-none truncate rounded-ui-control border border-ui-divider bg-ui-raised py-2 pl-3 pr-9 text-sm font-medium text-ui-ink"
              disabled={workspaces.length === 0 || syncStatus === 'syncing'}
              id="admin-header-workspace"
              onChange={(event) => onSelectWorkspace(event.target.value)}
              value={currentWorkspaceId ?? ''}
            >
              {workspaces.length === 0 ? (
                <option value="">{t('SHELL.NO_WORKSPACE')}</option>
              ) : null}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            {syncStatus === 'syncing' ? (
              <Loader2
                aria-hidden
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-text motion-reduce:animate-none"
              />
            ) : (
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted"
              />
            )}
          </>
        )}
      </div>
      <div className="relative hidden sm:block">
        <label className="sr-only" htmlFor="admin-header-language">
          {t('COMMON.LANGUAGE')}
        </label>
        <select
          className="min-h-10 w-[70px] appearance-none rounded-ui-control border border-ui-divider bg-ui-raised py-2 pl-3 pr-7 text-sm font-medium text-ui-ink"
          id="admin-header-language"
          onChange={(event) => onChangeLanguage(event.target.value)}
          value={language}
        >
          <option value="vi">VI</option>
          <option value="en">EN</option>
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-ink-muted"
        />
      </div>
      {user ? (
        <span
          aria-label={userInitials(user.full_name)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground"
        >
          {userInitials(user.full_name)}
        </span>
      ) : null}
      {logoutController ? (
        <Button
          aria-label={t('COMMON.LOGOUT')}
          isLoading={logoutController.isLoading}
          loadingText={t('SHELL.LOGGING_OUT')}
          onClick={() => void logoutController.logout()}
          size="icon"
          variant="ghost"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t('COMMON.LOGOUT')}</span>
        </Button>
      ) : null}
    </div>
  );
}
