import { Sparkles, X } from "lucide-react";
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

export interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface SidebarContentProps {
  activePath: string | undefined;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  onCloseMobile?: () => void;
  onSelectMobile?: () => void;
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
        className="grid h-9 w-9 shrink-0 place-items-center rounded-ui-control bg-primary text-primary-foreground"
      >
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-semibold leading-tight tracking-tight">
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
  hideTooltip,
  items,
  onSelect,
  presentation,
  showTooltip,
}: {
  activePath: string | undefined;
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

  return items.map((item) => {
    const label = t(item.key);
    const isActive = activePath === item.to;
    const Icon = item.icon;

    return (
      <div className="group relative" key={item.to}>
        <NavLink
          aria-label={label}
          className={`relative flex min-h-10 min-w-0 items-center rounded-ui-control py-2 text-sm no-underline transition-colors duration-200 motion-reduce:transition-none ${
            isDesktop
              ? "justify-center px-2"
              : "gap-3 px-3"
          } ${
            isActive
              ? "bg-muted font-medium text-primary"
              : "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
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
          {!isDesktop ? (
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
  onCloseMobile,
  onSelectMobile,
  presentation,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const isMobile = presentation === "mobile";
  const { clearTooltip, hideTooltip, showTooltip, tooltip } = useRailTooltip({
    disabled: isMobile,
    resetKey: "rail",
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isMobile ? (
        <div className="flex min-h-[84px] items-center justify-between gap-2 px-6 py-6">
          <BrandIdentity />
          <button
            aria-label={t("SHELL.CLOSE_NAV")}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-ui-control text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground motion-reduce:transition-none"
            onClick={onCloseMobile}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="h-14 shrink-0" />
      )}

      <nav
        aria-label={t("SHELL.PRIMARY_NAV")}
        className={`mt-1 grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto pb-3 ${isMobile ? "px-3" : "px-2"}`}
        onScroll={!isMobile ? clearTooltip : undefined}
      >
        <NavigationItems
          activePath={activePath}
          hideTooltip={!isMobile ? hideTooltip : undefined}
          items={primaryNavigationItems}
          onSelect={isMobile ? onSelectMobile : undefined}
          presentation={presentation}
          showTooltip={!isMobile ? showTooltip : undefined}
        />
      </nav>

      <div className={isMobile ? "p-4" : "p-2 pb-3"}>
        <NavigationItems
          activePath={activePath}
          hideTooltip={!isMobile ? hideTooltip : undefined}
          items={settingsNavigationItems}
          onSelect={isMobile ? onSelectMobile : undefined}
          presentation={presentation}
          showTooltip={!isMobile ? showTooltip : undefined}
        />
      </div>
      {!isMobile ? (
        <RailTooltipPortal hiddenAtLarge={false} tooltip={tooltip} />
      ) : null}
    </div>
  );
}

export function AdminSidebar({
  mobileOpen,
  onCloseMobile,
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
        className="fixed inset-y-0 left-0 z-40 hidden w-14 border-r border-border bg-background text-foreground md:flex md:flex-col"
        data-testid="admin-sidebar"
      >
        <SidebarContent
          activePath={activeItem?.to}
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
            className="fixed inset-y-0 left-0 z-40 w-64 rounded-r-ui-panel border-r border-border bg-background text-foreground shadow-ui-overlay md:hidden"
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
