# App Layouts — `frontend/src/app/layout/`

## AppShell
- Path: `frontend/src/app/layout/AppShell.tsx`
- Description: Authenticated shell: sidebar + header + outlet

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router-dom';

import type { User } from '../../core/auth/user-schema';
import { useAuthStore } from '../../core/stores/auth-store';
import { useWorkspaceStore } from '../../core/stores/workspace-store';
import { useSelectWorkspace, useWorkspaces } from '../../features/settings/hooks/use-workspaces';
import type { Workspace } from '../../features/settings/types/workspace';
import { ErrorState } from '../../shared/ui/ErrorState';
import { AdminHeader, type LogoutController } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { findActiveNavigationItem, findNavigationGroup, isChatWorkbenchPath } from './admin-navigation';
import { useSidebarLayout } from './use-sidebar-layout';

export interface AppShellProps {
  fetchWorkspaces: () => Promise<Workspace[]>;
  logoutController?: LogoutController;
  syncSelection: (workspaceId: string) => Promise<User>;
}

export function AppShell({ fetchWorkspaces, logoutController, syncSelection }: AppShellProps) {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { layout: sidebarLayout, toggle: toggleSidebarLayout } = useSidebarLayout();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const syncStatus = useWorkspaceStore((state) => state.syncStatus);
  const clearSyncStatus = useWorkspaceStore((state) => state.clearSyncStatus);
  const user = useAuthStore((state) => state.user);
  const workspaces = useWorkspaces({ fetchWorkspaces, syncSelection });
  const selectWorkspace = useSelectWorkspace({ syncSelection });
  const activeItem = findActiveNavigationItem(location.pathname);
  const activeGroup = findNavigationGroup(activeItem);
  const pageLabel = activeItem ? t(activeItem.key) : 'FLAE';
  const sectionLabel = activeGroup ? t(activeGroup.key) : t('SHELL.BRAND_SUBTITLE');
  const openNavigation = useCallback(() => setNavigationOpen(true), []);
  const closeNavigation = useCallback(() => setNavigationOpen(false), []);

  useEffect(() => {
    if (syncStatus !== 'success') return undefined;
    const timer = window.setTimeout(clearSyncStatus, 3000);
    return () => window.clearTimeout(timer);
  }, [clearSyncStatus, syncStatus]);

  const syncMessage = !workspaces.isSelectionInitialized
    ? t('SHELL.INITIALIZING')
    : syncStatus === 'syncing'
      ? t('SHELL.SYNCING')
      : syncStatus === 'success'
        ? t('SHELL.SYNC_SUCCESS')
        : syncStatus === 'error'
          ? t('SHELL.SYNC_ERROR')
          : null;

  return (
    <div className="glass-field min-h-screen bg-background text-foreground">
      <a className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-ui-control bg-primary-control px-4 py-2 font-semibold text-primary-control-foreground transition-transform duration-200 focus:translate-y-0" href="#main-content">{t('SHELL.SKIP_CONTENT')}</a>
      <AdminSidebar
        desktopLayout={sidebarLayout}
        mobileOpen={navigationOpen}
        onCloseMobile={closeNavigation}
        onToggleDesktop={toggleSidebarLayout}
      />

      <div className={`transition-[padding] duration-200 motion-reduce:transition-none md:pl-[72px] ${sidebarLayout === 'expanded' ? 'lg:pl-64' : 'lg:pl-[72px]'}`}>
        <AdminHeader
          currentWorkspaceId={currentWorkspaceId}
          language={i18n.resolvedLanguage ?? 'vi'}
          logoutController={logoutController}
          onChangeLanguage={(language) => void i18n.changeLanguage(language)}
          onOpenNavigation={openNavigation}
          onSelectWorkspace={(workspaceId) => void selectWorkspace(workspaceId).catch(() => undefined)}
          pageLabel={pageLabel}
          sectionLabel={sectionLabel}
          syncStatus={syncStatus}
          user={user}
          workspaces={workspaces.data ?? []}
          workspacesPending={workspaces.isPending}
        />

        {syncMessage ? <div aria-live="polite" className={`border-b px-4 py-2 text-sm md:px-6 xl:px-8 ${syncStatus === 'error' ? 'border-state-danger bg-state-danger-soft text-state-danger' : 'border-ui-divider bg-ui-raised text-ui-ink-secondary'}`} role="status">{syncMessage}</div> : null}
        {logoutController?.error ? <div className="border-b border-state-danger bg-state-danger-soft px-4 py-2 text-state-danger md:px-6 xl:px-8" role="alert">{t('SHELL.LOGOUT_ERROR')}</div> : null}

        <main
          className={isChatWorkbenchPath(location.pathname)
            ? 'flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden p-0'
            : 'min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-5 md:px-6 md:py-6 xl:px-8'}
          id="main-content"
          tabIndex={-1}
        >
          {workspaces.isError ? <ErrorState message={t('SHELL.LOAD_ERROR')} onRetry={() => void workspaces.refetch()} retryLabel={t('ERROR_PAGE.RETRY')} title={t('ERROR_PAGE.TITLE')} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

```

## AdminSidebar
- Path: `frontend/src/app/layout/AdminSidebar.tsx`
- Description: Collapsible nav rail

```tsx
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { type KeyboardEvent, type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import {
  type AdminNavigationItem,
  findActiveNavigationItem,
  navigationGroups,
} from "./admin-navigation";
import { RailTooltipPortal } from "./RailTooltipPortal";
import { SidebarStatusCard } from "./SidebarStatusCard";
import type { SidebarLayout } from "./use-sidebar-layout";
import { type TooltipInteraction, useRailTooltip } from "./use-rail-tooltip";

export interface AdminSidebarProps {
  desktopLayout: SidebarLayout;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
}

interface SidebarContentProps {
  activePath: string | undefined;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  desktopLayout?: SidebarLayout;
  onCloseMobile?: () => void;
  onSelectMobile?: () => void;
  onToggleDesktop?: () => void;
  presentation: "desktop" | "mobile";
}

const navigationItems = navigationGroups.flatMap((group) => group.items);
const primaryNavigationItems = navigationItems.filter(
  (item) => item.to !== "/dashboard/settings",
);
const settingsNavigationItems = navigationItems.filter(
  (item) => item.to === "/dashboard/settings",
);

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function BrandIdentity({
  expanded,
  responsive,
}: {
  expanded: boolean;
  responsive: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 items-center gap-2.5 text-sidebar-foreground">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-ui-control bg-primary text-primary-foreground shadow-[var(--glow-primary)]"
      >
        <Sparkles className="h-5 w-5" />
      </span>
      {expanded ? (
        <span className={`min-w-0 ${responsive ? "hidden lg:block" : ""}`}>
          <strong className="block truncate font-display font-semibold leading-tight tracking-tight">
            FLAE
          </strong>
          <small className="block truncate text-[11px] leading-tight text-sidebar-foreground/60">
            {t("SHELL.BRAND_SUBTITLE")}
          </small>
        </span>
      ) : null}
    </div>
  );
}

function NavigationItems({
  activePath,
  expanded,
  hideTooltip,
  items,
  onSelect,
  presentation,
  showTooltip,
}: {
  activePath: string | undefined;
  expanded: boolean;
  hideTooltip?: (target: HTMLElement, interaction: TooltipInteraction) => void;
  items: readonly AdminNavigationItem[];
  onSelect?: () => void;
  presentation: "desktop" | "mobile";
  showTooltip?: (
    target: HTMLElement,
    label: string,
    interaction: TooltipInteraction,
  ) => void;
}) {
  const { t } = useTranslation();

  return items.map((item) => {
    const label = t(item.key);
    const isActive = activePath === item.to;
    const Icon = item.icon;

    return (
      <div className="group relative" key={item.to}>
        <NavLink
          aria-label={label}
          className={`relative flex min-h-11 min-w-0 items-center rounded-ui-control border-l-2 py-2 text-sm no-underline transition-colors duration-200 motion-reduce:transition-none md:min-h-10 ${
            expanded && presentation === "desktop"
              ? "justify-center px-2 lg:justify-start lg:gap-3 lg:px-3"
              : expanded
                ? "gap-3 px-3"
                : "justify-center px-2"
          } ${
            isActive
              ? "border-orb-primary bg-sidebar-primary font-medium text-sidebar-primary-foreground"
              : "border-transparent bg-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
          end
          onBlur={(event) => hideTooltip?.(event.currentTarget, "focus")}
          onClick={onSelect}
          onFocus={(event) =>
            showTooltip?.(event.currentTarget, label, "focus")
          }
          onMouseEnter={(event) =>
            showTooltip?.(event.currentTarget, label, "hover")
          }
          onMouseLeave={(event) => hideTooltip?.(event.currentTarget, "hover")}
          ref={(element) => {
            // NavLink owns aria-current, so reapply the longest-prefix result.
            if (isActive) element?.setAttribute("aria-current", "page");
            else element?.removeAttribute("aria-current");
          }}
          to={item.to}
        >
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          {expanded ? (
            <span
              className={`min-w-0 truncate ${presentation === "desktop" ? "hidden lg:block" : ""}`}
            >
              {label}
            </span>
          ) : null}
        </NavLink>
      </div>
    );
  });
}

function SidebarContent({
  activePath,
  closeButtonRef,
  desktopLayout = "expanded",
  onCloseMobile,
  onSelectMobile,
  onToggleDesktop,
  presentation,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const isMobile = presentation === "mobile";
  const expanded = isMobile || desktopLayout === "expanded";
  const responsiveExpansion = !isMobile && expanded;
  const { clearTooltip, hideTooltip, showTooltip, tooltip } = useRailTooltip({
    disabled: isMobile,
    resetKey: desktopLayout,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`flex min-h-[84px] items-center justify-between gap-2 ${expanded ? "px-6 py-6" : "px-3 py-6"}`}
      >
        <BrandIdentity expanded={expanded} responsive={responsiveExpansion} />
        {isMobile ? (
          <button
            aria-label={t("SHELL.CLOSE_NAV")}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-ui-control text-sidebar-foreground/70 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground motion-reduce:transition-none"
            onClick={onCloseMobile}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : (
          <button
            aria-label={
              desktopLayout === "expanded"
                ? t("SHELL.COLLAPSE_NAV")
                : t("SHELL.EXPAND_NAV")
            }
            className={`hidden min-h-9 min-w-9 shrink-0 place-items-center rounded-ui-control text-sidebar-foreground/60 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground motion-reduce:transition-none lg:grid ${expanded ? "" : "absolute left-[18px] top-[76px]"}`}
            onClick={onToggleDesktop}
            type="button"
          >
            {desktopLayout === "expanded" ? (
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <nav
        aria-label={t("SHELL.PRIMARY_NAV")}
        className="mt-2 grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto px-3 pb-3"
        onScroll={!isMobile ? clearTooltip : undefined}
      >
        <NavigationItems
          activePath={activePath}
          expanded={expanded}
          hideTooltip={!isMobile ? hideTooltip : undefined}
          items={primaryNavigationItems}
          onSelect={isMobile ? onSelectMobile : undefined}
          presentation={presentation}
          showTooltip={!isMobile ? showTooltip : undefined}
        />
      </nav>

      <div className={`${expanded ? "p-4" : "p-3"}`}>
        {!isMobile && expanded ? (
          <div className="hidden lg:block">
            <SidebarStatusCard />
          </div>
        ) : null}
        <div className={expanded && !isMobile ? "mt-3" : ""}>
          <NavigationItems
            activePath={activePath}
            expanded={expanded}
            hideTooltip={!isMobile ? hideTooltip : undefined}
            items={settingsNavigationItems}
            onSelect={isMobile ? onSelectMobile : undefined}
            presentation={presentation}
            showTooltip={!isMobile ? showTooltip : undefined}
          />
        </div>
      </div>
      {!isMobile ? (
        <RailTooltipPortal hiddenAtLarge={expanded} tooltip={tooltip} />
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  desktopLayout,
  mobileOpen,
  onCloseMobile,
  onToggleDesktop,
}: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const activeItem = findActiveNavigationItem(location.pathname);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const priorFocusRef = useRef<HTMLElement | null>(null);
  const navigationCloseRequestedRef = useRef(false);
  const previousPathnameRef = useRef(location.pathname);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    const pathnameChanged = previousPathnameRef.current !== location.pathname;
    previousPathnameRef.current = location.pathname;
    if (!pathnameChanged) return;
    if (mobileOpen && !navigationCloseRequestedRef.current) onCloseMobile();
    navigationCloseRequestedRef.current = false;
  }, [location.pathname, mobileOpen, onCloseMobile]);

  const closeMobileFromSelection = () => {
    navigationCloseRequestedRef.current = true;
    onCloseMobile();
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;

    priorFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    restoreFocusOnCloseRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (restoreFocusOnCloseRef.current) priorFocusRef.current?.focus();
      navigationCloseRequestedRef.current = false;
      priorFocusRef.current = null;
      restoreFocusOnCloseRef.current = true;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const mediaQuery = window.matchMedia("(min-width: 48rem)");
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      restoreFocusOnCloseRef.current = false;
      onCloseMobile();
    };
    mediaQuery.addEventListener("change", handleBreakpointChange);
    if (mediaQuery.matches) {
      restoreFocusOnCloseRef.current = false;
      onCloseMobile();
    }

    return () => {
      mediaQuery.removeEventListener("change", handleBreakpointChange);
    };
  }, [mobileOpen, onCloseMobile]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseMobile();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-glass transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col ${
          desktopLayout === "expanded" ? "lg:w-64" : "lg:w-[72px]"
        }`}
        data-desktop-layout={desktopLayout}
        data-testid="admin-sidebar"
      >
        <SidebarContent
          activePath={activeItem?.to}
          desktopLayout={desktopLayout}
          onToggleDesktop={onToggleDesktop}
          presentation="desktop"
        />
      </aside>

      {mobileOpen ? (
        <>
          <button
            aria-label={t("SHELL.CLOSE_NAV_OVERLAY")}
            className="fixed inset-0 z-30 bg-ui-ink/35 md:hidden"
            onClick={onCloseMobile}
            type="button"
          />
          <div
            aria-label={t("SHELL.PRIMARY_NAV")}
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-40 w-64 rounded-r-ui-panel border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-ui-overlay backdrop-blur-glass md:hidden"
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
          >
            <SidebarContent
              activePath={activeItem?.to}
              closeButtonRef={closeButtonRef}
              onCloseMobile={onCloseMobile}
              onSelectMobile={closeMobileFromSelection}
              presentation="mobile"
            />
          </div>
        </>
      ) : null}
    </>
  );
}

```

## AdminHeader
- Path: `frontend/src/app/layout/AdminHeader.tsx`
- Description: Sticky top bar

```tsx
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

```

## admin-navigation
- Path: `frontend/src/app/layout/admin-navigation.ts`
- Description: Nav groups and active-route helpers

```tsx
import {
  BookOpen,
  Bot,
  MessageSquare,
  Settings,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationGroupId = "focus" | "intelligence" | "workspace";

export interface AdminNavigationItem {
  readonly exact?: boolean;
  readonly key: string;
  readonly to: string;
  readonly icon: LucideIcon;
}

export interface AdminNavigationGroup {
  readonly id: NavigationGroupId;
  readonly key: string;
  readonly items: readonly AdminNavigationItem[];
}

export const navigationGroups: readonly AdminNavigationGroup[] = [
  {
    id: "focus",
    key: "SHELL.NAV_GROUP_FOCUS",
    items: [
      {
        key: "NAV.CHAT",
        to: "/dashboard/chat",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "intelligence",
    key: "SHELL.NAV_GROUP_INTELLIGENCE",
    items: [
      {
        key: "NAV.AGENTS",
        to: "/dashboard/agents",
        icon: Bot,
      },
      {
        key: "NAV.KNOWLEDGE",
        to: "/dashboard/knowledge",
        icon: BookOpen,
      },
      {
        key: "NAV.TOPICS",
        to: "/dashboard/topics",
        icon: Tags,
      },
    ],
  },
  {
    id: "workspace",
    key: "SHELL.NAV_GROUP_WORKSPACE",
    items: [
      {
        key: "NAV.SETTINGS",
        to: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function findActiveNavigationItem(
  pathname: string,
): AdminNavigationItem | undefined {
  const cleanPathname = pathname.split(/[?#]/, 1)[0] ?? pathname;
  let activeItem: AdminNavigationItem | undefined;

  for (const group of navigationGroups) {
    for (const item of group.items) {
      const matchesRoute = item.exact
        ? cleanPathname === item.to
        : cleanPathname === item.to || cleanPathname.startsWith(`${item.to}/`);

      if (
        matchesRoute &&
        (!activeItem || item.to.length > activeItem.to.length)
      ) {
        activeItem = item;
      }
    }
  }

  return activeItem;
}

export function findNavigationGroup(
  item: AdminNavigationItem | undefined,
): AdminNavigationGroup | undefined {
  if (!item) {
    return undefined;
  }

  return navigationGroups.find((group) =>
    group.items.some((candidate) => candidate.to === item.to),
  );
}

export function isChatWorkbenchPath(pathname: string) {
  return pathname === "/dashboard/chat" || /^\/dashboard\/agents\/[^/]+\/chat$/.test(pathname);
}

```
