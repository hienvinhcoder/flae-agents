import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { User } from "../../core/auth/user-schema";
import type { Workspace } from "../../features/settings/types/workspace";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";

export type WorkspaceSyncStatus = "idle" | "syncing" | "success" | "error";

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
  const workspaceSelectorId = "admin-header-workspace";
  const languageSelectorId = "admin-header-language";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-ui-divider bg-ui-canvas/95 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 md:px-6 xl:px-8">
      <button
        aria-label={t("SHELL.OPEN_NAV")}
        className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink transition-colors duration-200 hover:bg-ui-interactive motion-reduce:transition-none md:hidden"
        onClick={onOpenNavigation}
        type="button"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 md:block md:max-w-48 xl:max-w-64">
        <p className="truncate font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ui-ink-muted">
          {sectionLabel}
        </p>
        <strong className="block truncate text-sm text-ui-ink">
          {pageLabel}
        </strong>
      </div>

      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <label className="sr-only" htmlFor={workspaceSelectorId}>
          {t("SHELL.WORKSPACE")}
        </label>
        {workspacesPending ? (
          <div className="flex min-h-11 items-center rounded-ui-control border border-ui-line bg-ui-raised px-3">
            <div className="min-w-0 flex-1">
              <Skeleton label={t("SHELL.LOADING_WORKSPACES")} lines={1} />
            </div>
          </div>
        ) : (
          <>
            <select
              className="min-h-11 w-full appearance-none truncate rounded-ui-control border border-ui-line bg-ui-raised px-3 pr-9 text-ui-ink transition-colors duration-200 hover:border-ui-line-strong motion-reduce:transition-none"
              disabled={workspaces.length === 0 || syncStatus === "syncing"}
              id={workspaceSelectorId}
              onChange={(event) => onSelectWorkspace(event.target.value)}
              value={currentWorkspaceId ?? ""}
            >
              {workspaces.length === 0 ? (
                <option value="">{t("SHELL.NO_WORKSPACE")}</option>
              ) : null}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted"
            />
          </>
        )}
      </div>

      <label className="sr-only" htmlFor={languageSelectorId}>
        {t("COMMON.LANGUAGE")}
      </label>
      <select
        className="min-h-11 shrink-0 rounded-ui-control border border-ui-line bg-ui-raised px-3 text-ui-ink transition-colors duration-200 hover:border-ui-line-strong motion-reduce:transition-none"
        id={languageSelectorId}
        onChange={(event) => onChangeLanguage(event.target.value)}
        value={language}
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>

      {user ? (
        <div className="hidden min-w-0 max-w-48 sm:block">
          <p className="truncate font-semibold text-ui-ink">{user.full_name}</p>
          <p className="truncate text-xs text-ui-ink-muted">{user.email}</p>
        </div>
      ) : null}

      {logoutController ? (
        <Button
          aria-label={t(
            logoutController.isLoading ? "SHELL.LOGGING_OUT" : "COMMON.LOGOUT",
          )}
          className="min-h-11 min-w-11 shrink-0 px-3 motion-reduce:transition-none"
          isLoading={logoutController.isLoading}
          loadingText={t("SHELL.LOGGING_OUT")}
          onClick={() => void logoutController.logout()}
          variant="ghost"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only sm:not-sr-only">{t("COMMON.LOGOUT")}</span>
        </Button>
      ) : null}
    </header>
  );
}
