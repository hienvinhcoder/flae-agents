import { Command, Menu, Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { HeaderUtilities } from './HeaderUtilities';
import type { LogoutController, WorkspaceSyncStatus } from './header-types';

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sidebar-border bg-sidebar px-3 backdrop-blur-glass sm:px-4 md:px-6 lg:px-8">
      <button
        aria-label={t('SHELL.OPEN_NAV')}
        className="glass-button grid min-h-10 min-w-10 place-items-center rounded-ui-control md:hidden"
        onClick={onOpenNavigation}
        type="button"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>
      <div className="sr-only">
        <span>{sectionLabel}</span>
        <strong>{pageLabel}</strong>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <div className="hidden md:block">
          <Button
            aria-label="MCP"
            className="font-normal text-ui-ink-muted disabled:opacity-100"
            disabled
            size="sm"
            title={t('SHELL.DEMO_ONLY')}
            variant="ghost"
          >
            <Command aria-hidden className="h-4 w-4" />
            MCP
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-chart-2"
              data-testid="mcp-status-indicator"
            />
          </Button>
        </div>
        <div className="hidden lg:block">
          <Button
            aria-label={t('SHELL.ADD_SOURCE')}
            className="header-add-source"
            disabled
            pill
            title={t('SHELL.DEMO_ONLY')}
          >
            <Plug aria-hidden className="h-4 w-4" />
            {t('SHELL.ADD_SOURCE')}
          </Button>
        </div>
        <HeaderUtilities
          currentWorkspaceId={currentWorkspaceId}
          language={language}
          logoutController={logoutController}
          onChangeLanguage={onChangeLanguage}
          onSelectWorkspace={onSelectWorkspace}
          syncStatus={syncStatus}
          user={user}
          workspaces={workspaces}
          workspacesPending={workspacesPending}
        />
      </div>
    </header>
  );
}
