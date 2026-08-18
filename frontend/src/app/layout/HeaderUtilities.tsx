import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import type { LogoutController, WorkspaceSyncStatus } from './header-types';

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
  const initials = user ? userInitials(user.full_name) : 'U';
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <div className="relative shrink-0" data-testid="admin-profile-menu">
      <button
        aria-controls="admin-profile-menu-panel"
        aria-expanded={profileMenuOpen}
        aria-haspopup="dialog"
        aria-label={initials}
        className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-foreground outline-none transition-shadow focus-visible:shadow-ui-focus"
        onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
        type="button"
      >
        {initials}
      </button>
      {profileMenuOpen ? (
        <div
          aria-label={`${t('SHELL.WORKSPACE')} · ${t('COMMON.LANGUAGE')}`}
          className="absolute right-0 top-12 z-50 w-72 rounded-ui-dialog border border-ui-divider bg-ui-raised p-4 text-ui-ink shadow-ui-overlay"
          id="admin-profile-menu-panel"
          role="dialog"
        >
          {user ? (
            <div className="mb-4 border-b border-ui-divider pb-3">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className="truncate text-xs text-ui-ink-muted">{user.email}</p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-ui-ink-secondary" htmlFor="admin-header-workspace">
              {t('SHELL.WORKSPACE')}
            </label>
            {workspacesPending ? (
              <div className="flex min-h-10 items-center rounded-ui-control border border-ui-divider bg-ui-raised px-3">
                <Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} />
              </div>
            ) : (
              <div className="relative">
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
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-1.5">
            <label className="text-xs font-medium text-ui-ink-secondary" htmlFor="admin-header-language">
              {t('COMMON.LANGUAGE')}
            </label>
            <div className="relative">
              <select
                className="min-h-10 w-full appearance-none rounded-ui-control border border-ui-divider bg-ui-raised py-2 pl-3 pr-9 text-sm font-medium text-ui-ink"
                id="admin-header-language"
                onChange={(event) => onChangeLanguage(event.target.value)}
                value={language}
              >
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted"
              />
            </div>
          </div>

          {logoutController ? (
            <Button
              aria-label={t('COMMON.LOGOUT')}
              className="mt-4 w-full justify-start"
              isLoading={logoutController.isLoading}
              loadingText={t('SHELL.LOGGING_OUT')}
              onClick={() => void logoutController.logout()}
              variant="ghost"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              <span>{t('COMMON.LOGOUT')}</span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
