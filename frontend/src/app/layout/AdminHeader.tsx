import { Menu, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { HeaderUtilities, WorkspaceSwitcher } from './HeaderUtilities';
import type { LogoutController, WorkspaceSyncStatus } from './header-types';
import { ThemeToggle } from './ThemeToggle';

export type { LogoutController, WorkspaceSyncStatus } from './header-types';

export interface AdminHeaderProps {
  currentWorkspaceId: string | null;
  language: string;
  logoutController?: LogoutController;
  onChangeLanguage: (language: string) => void;
  onOpenNavigation: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  pageLabel: string;
  sectionLabel: string;
  syncStatus: WorkspaceSyncStatus;
  user: User | null;
  workspaces: Workspace[];
  workspacesPending: boolean;
}

export function AdminHeader({
  currentWorkspaceId,
  language,
  logoutController,
  onChangeLanguage,
  onOpenNavigation,
  onSelectWorkspace,
  pageLabel,
  sectionLabel,
  syncStatus,
  user,
  workspaces,
  workspacesPending,
}: AdminHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-3 md:px-4">
      <button
        aria-label={t('SHELL.OPEN_NAV')}
        className="grid min-h-10 min-w-10 place-items-center rounded-ui-control text-foreground transition-colors hover:bg-accent md:hidden"
        onClick={onOpenNavigation}
        type="button"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>

      <Link
        aria-label="FLAE"
        className="flex min-w-0 items-center gap-2 text-foreground no-underline"
        to="/dashboard/chat"
      >
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-ui-control bg-primary text-primary-foreground"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <strong className="truncate text-sm font-semibold tracking-tight">FLAE</strong>
      </Link>

      <WorkspaceSwitcher
        currentWorkspaceId={currentWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        syncStatus={syncStatus}
        workspaces={workspaces}
        workspacesPending={workspacesPending}
      />

      <div className="sr-only">
        <span>{sectionLabel}</span>
        <strong>{pageLabel}</strong>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <ThemeToggle />
        <HeaderUtilities
          language={language}
          logoutController={logoutController}
          onChangeLanguage={onChangeLanguage}
          user={user}
        />
      </div>
    </header>
  );
}
