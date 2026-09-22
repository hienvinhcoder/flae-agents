import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import type { LogoutController, WorkspaceSyncStatus } from './header-types';

export interface WorkspaceSwitcherProps {
  currentWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  syncStatus: WorkspaceSyncStatus;
  workspaces: Workspace[];
  workspacesPending: boolean;
}

export interface HeaderUtilitiesProps {
  language: string;
  logoutController?: LogoutController;
  onChangeLanguage: (language: string) => void;
  user: User | null;
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

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onSelectWorkspace,
  syncStatus,
  workspaces,
  workspacesPending,
}: WorkspaceSwitcherProps) {
  const { t } = useTranslation();

  if (workspacesPending) {
    return (
      <div className="flex h-8 min-w-[8rem] items-center rounded-md px-2 md:min-w-[10rem]">
        <Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} />
      </div>
    );
  }

  return (
    <div className="relative min-w-0 max-w-[14rem]">
      <label className="sr-only" htmlFor="admin-header-workspace">
        {t('SHELL.WORKSPACE')}
      </label>
      <select
        className="h-8 w-full appearance-none truncate rounded-md border-0 bg-transparent py-1.5 pl-2 pr-7 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-60 [&>option]:bg-card [&>option]:text-foreground"
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
          className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary motion-reduce:animate-none"
        />
      ) : (
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
    </div>
  );
}

export function HeaderUtilities({
  language,
  logoutController,
  onChangeLanguage,
  user,
}: HeaderUtilitiesProps) {
  const { t } = useTranslation();
  const initials = user ? userInitials(user.full_name) : 'U';
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setProfileMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  return (
    <div className="relative shrink-0" data-testid="admin-profile-menu">
      <button
        aria-controls="admin-profile-menu-panel"
        aria-expanded={profileMenuOpen}
        aria-haspopup="dialog"
        aria-label={initials}
        className={`grid h-7 w-7 place-items-center rounded-full bg-border text-[12px] font-medium text-foreground outline-none transition-all hover:brightness-95 active:scale-95 focus-visible:shadow-ui-focus ${
          profileMenuOpen
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            : ''
        }`}
        onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
        ref={triggerRef}
        type="button"
      >
        {initials}
      </button>
      {profileMenuOpen ? (
        <div
          aria-label={`${t('SHELL.WORKSPACE')} · ${t('COMMON.LANGUAGE')}`}
          className="absolute right-0 top-11 z-50 w-72 rounded-ui-dialog border border-border bg-card p-4 text-foreground shadow-ui-overlay"
          id="admin-profile-menu-panel"
          ref={menuRef}
          role="dialog"
        >
          {user ? (
            <div className="mb-3.5 flex items-center gap-3 border-b border-border pb-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-header-language">
              {t('COMMON.LANGUAGE')}
            </label>
            <div className="relative">
              <select
                className="min-h-10 w-full appearance-none rounded-ui-control border border-border bg-card py-2 pl-3 pr-9 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:shadow-ui-focus [&>option]:bg-card [&>option]:text-foreground"
                id="admin-header-language"
                onChange={(event) => onChangeLanguage(event.target.value)}
                value={language}
              >
                <option value="vi">VI</option>
                <option value="en">EN</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          {logoutController ? (
            <div className="mt-4 border-t border-border pt-3">
              <Button
                aria-label={t('COMMON.LOGOUT')}
                className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                isLoading={logoutController.isLoading}
                loadingText={t('SHELL.LOGGING_OUT')}
                onClick={() => void logoutController.logout()}
                variant="ghost"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                <span>{t('COMMON.LOGOUT')}</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
