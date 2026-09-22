import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { type KeyboardEvent, type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import {
  type AdminNavigationItem,
  findActiveNavigationItem,
  navigationGroups,
} from "./admin-navigation";
import { RailTooltipPortal } from "./RailTooltipPortal";
import { type TooltipInteraction, useRailTooltip } from "./use-rail-tooltip";
import type { SidebarLayout } from "./use-sidebar-layout";

export interface AdminSidebarProps {
  desktopLayout: SidebarLayout;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleDesktop: () => void;
}

interface SidebarContentProps {
  activePath: string | undefined;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  desktopLayout: SidebarLayout;
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

function BrandIdentity() {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 items-center gap-2.5 text-foreground">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary text-[12px] font-bold text-primary-foreground"
      >
        F
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[14px] font-semibold leading-tight tracking-tight">
          FLAE
        </strong>
        <small className="block truncate text-[11px] leading-tight text-muted-foreground">
          {t("SHELL.BRAND_SUBTITLE")}
        </small>
      </span>
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
  const isDesktop = presentation === "desktop";
  const showLabels = !isDesktop || expanded;
  const useTooltips = isDesktop && !expanded;

  return items.map((item) => {
    const label = t(item.key);
    const isActive = activePath === item.to;
    const Icon = item.icon;

    return (
      <div className="group relative w-full" key={item.to}>
        <NavLink
          aria-label={label}
          className={`relative flex items-center text-[13px] no-underline transition-colors duration-200 motion-reduce:transition-none ${
            isDesktop && !expanded
              ? "mx-auto h-10 w-10 justify-center rounded-md"
              : "min-h-10 w-full gap-3 rounded-md px-3 py-2"
          } ${
            isActive
              ? "bg-muted font-medium text-primary"
              : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          end
          onBlur={(event) =>
            useTooltips
              ? hideTooltip?.(event.currentTarget, "focus")
              : undefined
          }
          onClick={onSelect}
          onFocus={(event) =>
            useTooltips
              ? showTooltip?.(event.currentTarget, label, "focus")
              : undefined
          }
          onMouseEnter={(event) =>
            useTooltips
              ? showTooltip?.(event.currentTarget, label, "hover")
              : undefined
          }
          onMouseLeave={(event) =>
            useTooltips
              ? hideTooltip?.(event.currentTarget, "hover")
              : undefined
          }
          ref={(element) => {
            if (isActive) element?.setAttribute("aria-current", "page");
            else element?.removeAttribute("aria-current");
          }}
          to={item.to}
        >
          <Icon
            aria-hidden="true"
            className={
              isDesktop && !expanded ? "h-5 w-5" : "h-4 w-4 shrink-0"
            }
          />
          {showLabels ? (
            <span className="min-w-0 truncate">{label}</span>
          ) : null}
        </NavLink>
      </div>
    );
  });
}

function SidebarContent({
  activePath,
  closeButtonRef,
  desktopLayout,
  onCloseMobile,
  onSelectMobile,
  onToggleDesktop,
  presentation,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const isMobile = presentation === "mobile";
  const expanded = isMobile || desktopLayout === "expanded";
  const { clearTooltip, hideTooltip, showTooltip, tooltip } = useRailTooltip({
    disabled: isMobile || expanded,
    resetKey: desktopLayout,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isMobile ? (
        <div className="flex min-h-[72px] items-center justify-between gap-2 px-5 py-5">
          <BrandIdentity />
          <button
            aria-label={t("SHELL.CLOSE_NAV")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
            onClick={onCloseMobile}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <nav
        aria-label={t("SHELL.PRIMARY_NAV")}
        className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto ${
          isMobile
            ? "items-stretch px-3 pb-3"
            : expanded
              ? "items-stretch px-3 py-4"
              : "items-center px-0 py-4"
        }`}
        onScroll={!isMobile && !expanded ? clearTooltip : undefined}
      >
        <div
          className={`flex flex-col gap-1 ${expanded || isMobile ? "w-full" : "items-center"}`}
        >
          <NavigationItems
            activePath={activePath}
            expanded={expanded}
            hideTooltip={!isMobile && !expanded ? hideTooltip : undefined}
            items={primaryNavigationItems}
            onSelect={isMobile ? onSelectMobile : undefined}
            presentation={presentation}
            showTooltip={!isMobile && !expanded ? showTooltip : undefined}
          />
        </div>
        <div className="flex-1" />
        <div
          className={`flex flex-col gap-1 ${expanded || isMobile ? "w-full" : "items-center"}`}
        >
          <NavigationItems
            activePath={activePath}
            expanded={expanded}
            hideTooltip={!isMobile && !expanded ? hideTooltip : undefined}
            items={settingsNavigationItems}
            onSelect={isMobile ? onSelectMobile : undefined}
            presentation={presentation}
            showTooltip={!isMobile && !expanded ? showTooltip : undefined}
          />
          {!isMobile && onToggleDesktop ? (
            <button
              aria-label={
                expanded ? t("SHELL.COLLAPSE_NAV") : t("SHELL.EXPAND_NAV")
              }
              className={`flex items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
                expanded
                  ? "min-h-10 w-full gap-3 px-3 py-2 text-[13px]"
                  : "h-10 w-10 justify-center"
              }`}
              onClick={onToggleDesktop}
              type="button"
            >
              {expanded ? (
                <PanelLeftClose aria-hidden className="h-4 w-4 shrink-0" />
              ) : (
                <PanelLeftOpen aria-hidden className="h-5 w-5" />
              )}
              {expanded ? (
                <span className="truncate">{t("SHELL.COLLAPSE_NAV")}</span>
              ) : null}
            </button>
          ) : null}
        </div>
      </nav>
      {!isMobile && !expanded ? (
        <RailTooltipPortal hiddenAtLarge={false} tooltip={tooltip} />
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
  const expanded = desktopLayout === "expanded";

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
        className={`hidden shrink-0 border-r border-border bg-background text-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col ${
          expanded ? "w-64" : "w-[56px]"
        }`}
        data-layout={desktopLayout}
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
            className="fixed inset-0 z-30 bg-foreground/35 md:hidden"
            onClick={onCloseMobile}
            type="button"
          />
          <div
            aria-label={t("SHELL.PRIMARY_NAV")}
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-40 w-64 rounded-r-lg border-r border-border bg-background text-foreground shadow-ui-overlay md:hidden"
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
          >
            <SidebarContent
              activePath={activeItem?.to}
              closeButtonRef={closeButtonRef}
              desktopLayout="expanded"
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
