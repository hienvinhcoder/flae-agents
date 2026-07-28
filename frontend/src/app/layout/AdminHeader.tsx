import { Command, Menu, Plug, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { HeaderUtilities } from './HeaderUtilities';

export type WorkspaceSyncStatus = 'error' | 'idle' | 'success' | 'syncing';

export interface LogoutController {
  error: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ui-divider bg-ui-canvas/90 px-3 backdrop-blur-md sm:px-4 md:px-6 xl:px-8">
      <button
        aria-label={t('SHELL.OPEN_NAV')}
        className="grid min-h-10 min-w-10 place-items-center rounded-ui-control border border-ui-divider bg-ui-raised md:hidden"
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
          className="h-10 w-full rounded-ui-control border border-transparent bg-ui-interactive pl-10 pr-14 text-sm placeholder:text-ui-ink-muted focus:border-brand-text focus:outline-none"
          id="admin-header-search"
          placeholder={t('SHELL.SEARCH_PLACEHOLDER')}
          readOnly
          role="searchbox"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-ui-divider bg-ui-canvas px-1.5 py-0.5 text-xs text-ui-ink-muted sm:block">
          ⌘ K
        </kbd>
        <span className="sr-only" id="admin-header-demo">
          {t('SHELL.DEMO_ONLY')}
        </span>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <Button
          aria-label="MCP"
          className="hidden disabled:opacity-100 lg:inline-flex"
          disabled
          size="sm"
          title={t('SHELL.DEMO_ONLY')}
          variant="ghost"
        >
          <Command aria-hidden className="h-4 w-4" />
          MCP
        </Button>
        <Button
          aria-label={t('SHELL.ADD_SOURCE')}
          className="hidden disabled:opacity-100 xl:inline-flex"
          disabled
          size="sm"
          title={t('SHELL.DEMO_ONLY')}
        >
          <Plug aria-hidden className="h-4 w-4" />
          {t('SHELL.ADD_SOURCE')}
        </Button>
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
