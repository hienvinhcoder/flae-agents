import { Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { type KeyboardEvent, type RefObject, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";

import { findActiveNavigationItem, navigationGroups } from "./admin-navigation";
import type { SidebarLayout } from "./use-sidebar-layout";

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
    <div className="flex min-w-0 items-center gap-3 text-ui-ink">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-brand font-bold text-brand-foreground shadow-ui-panel"
      >
        F
      </span>
      {expanded ? (
        <span className={`min-w-0 ${responsive ? "hidden lg:block" : ""}`}>
          <strong className="block truncate tracking-[0.16em]">FLAE</strong>
          <small className="block truncate text-ui-ink-muted">
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
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-ui-control border border-ui-divider bg-ui-raised px-3 text-ui-ink-secondary"
    >
      <Building2 aria-hidden="true" className="h-5 w-5 shrink-0" />
      {expanded ? (
        <span
          className={`min-w-0 truncate font-medium text-ui-ink ${responsive ? "hidden lg:block" : ""}`}
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
  onSelect,
  presentation,
}: {
  activePath: string | undefined;
  expanded: boolean;
  onSelect?: () => void;
  presentation: "desktop" | "mobile";
}) {
  const { t } = useTranslation();

  return navigationGroups.map((group) => (
    <section className="grid gap-1" key={group.id}>
      {expanded ? (
        <h2
          className={`px-3 pb-1 pt-3 font-code text-label-md uppercase tracking-[0.12em] text-ui-ink-muted ${presentation === "desktop" ? "hidden lg:block" : ""}`}
        >
          {t(group.key)}
        </h2>
      ) : (
        <div aria-hidden="true" className="my-2 border-t border-ui-divider" />
      )}
      {expanded && presentation === "desktop" ? (
        <div
          aria-hidden="true"
          className="my-2 border-t border-ui-divider lg:hidden"
        />
      ) : null}
      {group.items.map((item) => {
        const label = t(item.key);
        const isActive = activePath === item.to;
        const tooltipId = `admin-nav-${group.id}-${item.to.replaceAll("/", "-")}`;
        const Icon = item.icon;

        return (
          <div className="group relative" key={item.to}>
            <NavLink
              aria-describedby={
                presentation === "desktop" ? tooltipId : undefined
              }
              aria-label={label}
              className={`relative flex min-h-11 min-w-0 items-center rounded-ui-control py-2 no-underline transition-colors duration-200 motion-reduce:transition-none ${
                expanded && presentation === "desktop"
                  ? "justify-center px-2 lg:justify-start lg:gap-3 lg:px-3"
                  : expanded
                    ? "gap-3 px-3"
                    : "justify-center px-2"
              } ${
                isActive
                  ? "bg-brand-soft font-semibold text-ui-ink"
                  : "text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink"
              }`}
              end
              onClick={onSelect}
              ref={(element) => {
                // NavLink owns aria-current, so reapply the longest-prefix result.
                if (isActive) element?.setAttribute("aria-current", "page");
                else element?.removeAttribute("aria-current");
              }}
              to={item.to}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-1 rounded-r-ui-status bg-brand"
                />
              ) : null}
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              {expanded ? (
                <span
                  className={`min-w-0 truncate ${presentation === "desktop" ? "hidden lg:block" : ""}`}
                >
                  {label}
                </span>
              ) : null}
            </NavLink>
            {presentation === "desktop" ? (
              <span
                className={`pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-ui-control border border-ui-divider bg-ui-raised px-3 py-2 text-sm font-medium text-ui-ink opacity-0 shadow-ui-panel transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none ${expanded ? "lg:hidden" : ""}`}
                id={tooltipId}
                role="tooltip"
              >
                {label}
              </span>
            ) : null}
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
  onToggleDesktop,
  presentation,
  workspaceName,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const isMobile = presentation === "mobile";
  const expanded = isMobile || desktopLayout === "expanded";
  const responsiveExpansion = !isMobile && expanded;

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="flex min-h-12 items-center justify-between gap-2">
        <BrandIdentity expanded={expanded} responsive={responsiveExpansion} />
        {isMobile ? (
          <button
            aria-label={t("SHELL.CLOSE_NAV")}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-ui-control text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
            onClick={onCloseMobile}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        <WorkspaceIdentity
          expanded={expanded}
          responsive={responsiveExpansion}
          workspaceName={workspaceName}
        />
      </div>

      <nav
        aria-label={t("SHELL.PRIMARY_NAV")}
        className="mt-4 grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pb-3"
      >
        <NavigationGroups
          activePath={activePath}
          expanded={expanded}
          onSelect={isMobile ? onCloseMobile : undefined}
          presentation={presentation}
        />
      </nav>

      {!isMobile ? (
        <button
          aria-label={
            desktopLayout === "expanded"
              ? t("SHELL.COLLAPSE_NAV")
              : t("SHELL.EXPAND_NAV")
          }
          className="mt-2 hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-ui-control border border-ui-divider bg-ui-raised px-3 font-medium text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none lg:flex"
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

  useEffect(() => {
    if (!mobileOpen) return undefined;

    priorFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      priorFocusRef.current?.focus();
      priorFocusRef.current = null;
    };
  }, [mobileOpen]);

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
        className={`fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-ui-divider bg-ui-panel transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col ${
          desktopLayout === "expanded" ? "lg:w-72" : "lg:w-[72px]"
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
            className="fixed inset-y-0 left-0 z-40 w-72 rounded-r-ui-panel border-r border-ui-divider bg-ui-panel shadow-ui-overlay md:hidden"
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
          >
            <SidebarContent
              activePath={activeItem?.to}
              closeButtonRef={closeButtonRef}
              onCloseMobile={onCloseMobile}
              presentation="mobile"
              workspaceName={resolvedWorkspaceName}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
