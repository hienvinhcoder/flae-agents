import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
        className={`grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground outline-none transition-all hover:brightness-110 active:scale-95 focus-visible:shadow-ui-focus ${
          profileMenuOpen
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/25'
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
          className="absolute right-0 top-12 z-50 w-72 rounded-ui-dialog border border-border/80 bg-[#18130c]/98 p-4 text-foreground shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all"
          id="admin-profile-menu-panel"
          ref={menuRef}
          role="dialog"
        >
          {user ? (
            <div className="mb-3.5 flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary ring-1 ring-primary/30">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-header-workspace">
              {t('SHELL.WORKSPACE')}
            </label>
            {workspacesPending ? (
              <div className="flex min-h-10 items-center rounded-ui-control border border-border/60 bg-secondary/40 px-3">
                <Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} />
              </div>
            ) : (
              <div className="relative">
                <select
                  className="min-h-10 w-full appearance-none truncate rounded-ui-control border border-border/80 bg-secondary/70 py-2 pl-3 pr-9 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary/90 focus:border-primary focus:bg-secondary focus:ring-1 focus:ring-primary/40 [&>option]:bg-[#18130c] [&>option]:text-foreground"
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
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary motion-reduce:animate-none"
                  />
                ) : (
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                )}
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-header-language">
              {t('COMMON.LANGUAGE')}
            </label>
            <div className="relative">
              <select
                className="min-h-10 w-full appearance-none rounded-ui-control border border-border/80 bg-secondary/70 py-2 pl-3 pr-9 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary/90 focus:border-primary focus:bg-secondary focus:ring-1 focus:ring-primary/40 [&>option]:bg-[#18130c] [&>option]:text-foreground"
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
            <div className="mt-4 border-t border-border/60 pt-3">
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
