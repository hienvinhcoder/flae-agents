import { Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { type KeyboardEvent, type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import { findActiveNavigationItem, navigationGroups } from "./admin-navigation";
import { RailTooltipPortal } from "./RailTooltipPortal";
import { SidebarStatusCard } from "./SidebarStatusCard";
import type { SidebarLayout } from "./use-sidebar-layout";
import { type TooltipInteraction, useRailTooltip } from "./use-rail-tooltip";

export interface AdminSidebarProps {
  desktopLayout: SidebarLayout;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
  workspaceName?: string;
}

interface SidebarContentProps {
  activePath: string | undefined;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  desktopLayout?: SidebarLayout;
  onCloseMobile?: () => void;
  onSelectMobile?: () => void;
  onToggleDesktop?: () => void;
  presentation: "desktop" | "mobile";
  workspaceName: string;
}

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
    <div className="flex min-w-0 items-center gap-3 text-sidebar-foreground">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-brand text-sm font-bold text-brand-foreground"
      >
        F
      </span>
      {expanded ? (
        <span className={`min-w-0 ${responsive ? "hidden lg:block" : ""}`}>
          <strong className="block truncate text-sm font-semibold tracking-[0.18em]">
            FLAE
          </strong>
          <small className="block truncate font-code text-xs uppercase tracking-[0.08em] text-sidebar-foreground/60">
            {t("SHELL.BRAND_SUBTITLE")}
          </small>
        </span>
      ) : null}
    </div>
  );
}

function WorkspaceIdentity({
  expanded,
  responsive,
  workspaceName,
}: {
  expanded: boolean;
  responsive: boolean;
  workspaceName: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={`${t("SHELL.WORKSPACE")}: ${workspaceName}`}
      className="flex min-h-14 min-w-0 items-center gap-3 border-y border-sidebar-border bg-sidebar-accent/70 px-3 text-sidebar-foreground/70"
      role="group"
    >
      <Building2 aria-hidden="true" className="h-5 w-5 shrink-0" />
      {expanded ? (
        <span
          className={`min-w-0 truncate font-medium text-sidebar-foreground ${responsive ? "hidden lg:block" : ""}`}
        >
          {workspaceName}
        </span>
      ) : null}
    </div>
  );
}

function NavigationGroups({
  activePath,
  expanded,
  hideTooltip,
  onSelect,
  presentation,
  showTooltip,
}: {
  activePath: string | undefined;
  expanded: boolean;
  hideTooltip?: (target: HTMLElement, interaction: TooltipInteraction) => void;
  onSelect?: () => void;
  presentation: "desktop" | "mobile";
  showTooltip?: (
    target: HTMLElement,
    label: string,
    interaction: TooltipInteraction,
  ) => void;
}) {
  const { t } = useTranslation();

  return navigationGroups.map((group) => (
    <section className="grid gap-0.5" key={group.id}>
      {expanded ? (
        <h2
          className={`px-3 pb-1 pt-4 font-code text-label-md uppercase tracking-[0.12em] text-sidebar-foreground/50 ${presentation === "desktop" ? "hidden lg:block" : ""}`}
        >
          {t(group.key)}
        </h2>
      ) : (
        <div aria-hidden="true" className="my-2 border-t border-sidebar-border" />
      )}
      {expanded && presentation === "desktop" ? (
        <div
          aria-hidden="true"
          className="my-2 border-t border-sidebar-border lg:hidden"
        />
      ) : null}
      {group.items.map((item) => {
        const label = t(item.key);
        const isActive = activePath === item.to;
        const Icon = item.icon;

        return (
          <div className="group relative" key={item.to}>
            <NavLink
              aria-label={label}
              className={`relative flex min-h-11 min-w-0 items-center rounded-ui-control py-2 no-underline transition-colors duration-200 motion-reduce:transition-none ${
                expanded && presentation === "desktop"
                  ? "justify-center px-2 lg:justify-start lg:gap-3 lg:px-3"
                  : expanded
                    ? "gap-3 px-3"
                    : "justify-center px-2"
              } ${
                isActive
                  ? "bg-brand font-semibold text-brand-foreground"
                  : "bg-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
              onMouseLeave={(event) =>
                hideTooltip?.(event.currentTarget, "hover")
              }
              ref={(element) => {
                // NavLink owns aria-current, so reapply the longest-prefix result.
                if (isActive) element?.setAttribute("aria-current", "page");
                else element?.removeAttribute("aria-current");
              }}
              to={item.to}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
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
      })}
    </section>
  ));
}

function SidebarContent({
  activePath,
  closeButtonRef,
  desktopLayout = "expanded",
  onCloseMobile,
  onSelectMobile,
  onToggleDesktop,
  presentation,
  workspaceName,
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
    <div className="flex h-full min-h-0 flex-col px-3 py-4">
      <div className="flex min-h-12 items-center justify-between gap-2">
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
        ) : null}
      </div>

      <div className="mt-4">
        <WorkspaceIdentity
          expanded={expanded}
          responsive={responsiveExpansion}
          workspaceName={workspaceName}
        />
      </div>

      <nav
        aria-label={t("SHELL.PRIMARY_NAV")}
        className="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pb-3"
        onScroll={!isMobile ? clearTooltip : undefined}
      >
        <NavigationGroups
          activePath={activePath}
          expanded={expanded}
          hideTooltip={!isMobile ? hideTooltip : undefined}
          onSelect={isMobile ? onSelectMobile : undefined}
          presentation={presentation}
          showTooltip={!isMobile ? showTooltip : undefined}
        />
      </nav>

      {!isMobile && expanded ? (
        <div className="hidden lg:block">
          <SidebarStatusCard />
        </div>
      ) : null}

      {!isMobile ? (
        <button
          aria-label={
            desktopLayout === "expanded"
              ? t("SHELL.COLLAPSE_NAV")
              : t("SHELL.EXPAND_NAV")
          }
          className="mt-2 hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-ui-control border border-transparent bg-transparent px-3 font-medium text-sidebar-foreground/70 transition-colors duration-200 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground motion-reduce:transition-none lg:flex"
          onClick={onToggleDesktop}
          type="button"
        >
          {desktopLayout === "expanded" ? (
            <ChevronLeft aria-hidden="true" className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0" />
          )}
          {desktopLayout === "expanded" ? (
            <span className="min-w-0 truncate">{t("SHELL.COLLAPSE_NAV")}</span>
          ) : null}
        </button>
      ) : null}
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
  workspaceName,
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

  const resolvedWorkspaceName = workspaceName ?? t("SHELL.WORKSPACE");

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col ${
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
          workspaceName={resolvedWorkspaceName}
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
            className="fixed inset-y-0 left-0 z-40 w-64 rounded-r-ui-panel border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-ui-overlay md:hidden"
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
              workspaceName={resolvedWorkspaceName}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
