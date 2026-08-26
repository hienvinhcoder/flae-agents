import { Command, Menu, Plug, Search } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-3 backdrop-blur-glass sm:px-4 md:px-6 lg:px-8">
      <button
        aria-label={t('SHELL.OPEN_NAV')}
        className="grid min-h-10 min-w-10 place-items-center rounded-ui-control border border-border bg-card md:hidden"
        onClick={onOpenNavigation}
        type="button"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>
      <div className="sr-only">
        <span>{sectionLabel}</span>
        <strong>{pageLabel}</strong>
      </div>
      <Button
        aria-label={t('SHELL.SEARCH_MEMORY')}
        className="disabled:opacity-100 sm:hidden"
        disabled
        size="icon"
        title={t('SHELL.DEMO_ONLY')}
        variant="ghost"
      >
        <Search aria-hidden className="h-4 w-4" />
      </Button>
      <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl">
        <label className="sr-only" htmlFor="admin-header-search">
          {t('SHELL.SEARCH_MEMORY')}
        </label>
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted"
        />
        <input
          aria-describedby="admin-header-demo"
          className="h-10 w-full rounded-ui-control border border-transparent bg-secondary pl-10 pr-24 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          id="admin-header-search"
          placeholder={t('SHELL.SEARCH_PLACEHOLDER')}
          readOnly
          role="searchbox"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground sm:block">
          ⌘ K
        </kbd>
        <span className="sr-only" id="admin-header-demo">
          {t('SHELL.DEMO_ONLY')}
        </span>
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
