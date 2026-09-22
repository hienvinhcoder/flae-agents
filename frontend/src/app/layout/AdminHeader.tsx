import { Menu } from 'lucide-react';
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
    <header className="z-10 flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label={t('SHELL.OPEN_NAV')}
          className="grid h-9 w-9 place-items-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden"
          onClick={onOpenNavigation}
          type="button"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>

        <Link
          aria-label="FLAE"
          className="hidden items-center gap-2 border-r border-border pr-4 text-foreground no-underline md:flex"
          to="/dashboard/chat"
        >
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded bg-primary text-[12px] font-bold text-primary-foreground"
          >
            F
          </span>
          <span className="text-[14px] font-semibold tracking-tight">FLAE</span>
        </Link>

        <WorkspaceSwitcher
          currentWorkspaceId={currentWorkspaceId}
          onSelectWorkspace={onSelectWorkspace}
          syncStatus={syncStatus}
          workspaces={workspaces}
          workspacesPending={workspacesPending}
        />
      </div>

      <div className="sr-only">
        <span>{sectionLabel}</span>
        <strong>{pageLabel}</strong>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
