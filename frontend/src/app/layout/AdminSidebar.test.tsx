import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createI18n } from "../../shared/i18n";
import { AdminSidebar, type AdminSidebarProps } from "./AdminSidebar";

const resources = {
  en: {
    translation: {
      NAV: {
        AGENTS: "Agents",
        BRIEFING: "Briefing",
        CHAT: "Chat",
        INBOX: "Inbox",
        KNOWLEDGE: "Knowledge",
        OVERVIEW: "Overview",
        REPORTS: "Reports",
        SETTINGS: "Settings",
        TOPICS: "Topics",
      },
      SHELL: {
        BRAND_SUBTITLE: "AI operations",
        CLOSE_NAV: "Close navigation",
        CLOSE_NAV_OVERLAY: "Close navigation overlay",
        COLLAPSE_NAV: "Collapse navigation",
        EXPAND_NAV: "Expand navigation",
        INDEXING_FRESHNESS: "Live · 2s ago",
        INDEXING_PROGRESS: "Indexing progress",
        INDEXING_STATUS: "Indexing status",
        KNOWLEDGE_GRAPH: "Knowledge Graph",
        NAV_GROUP_FOCUS: "Focus",
        NAV_GROUP_INTELLIGENCE: "Intelligence",
        NAV_GROUP_WORKSPACE: "Workspace",
        PRIMARY_NAV: "Primary navigation",
        WORKSPACE: "Workspace",
      },
    },
  },
};

const defaultProps: AdminSidebarProps = {
  desktopLayout: "expanded",
  mobileOpen: false,
  onCloseMobile: vi.fn(),
  onToggleDesktop: vi.fn(),
  workspaceName: "FLAE Labs",
};

type MediaQueryChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches = false) {
  const listeners = new Set<MediaQueryChangeListener>();
  let matches = initialMatches;
  const media = "(min-width: 48rem)";
  const mediaQueryList = {
    addEventListener: vi.fn(
      (_type: string, listener: MediaQueryChangeListener) => {
        listeners.add(listener);
      },
    ),
    dispatchEvent: vi.fn(() => true),
    get matches() {
      return matches;
    },
    media,
    onchange: null,
    removeEventListener: vi.fn(
      (_type: string, listener: MediaQueryChangeListener) => {
        listeners.delete(listener);
      },
    ),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQueryList),
  );

  return {
    emit(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches, media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

async function renderSidebar(
  props: Partial<AdminSidebarProps> = {},
  initialPath = "/dashboard/briefing",
) {
  const i18n = await createI18n(resources, "en");
  const resolvedProps = { ...defaultProps, ...props };

  const view = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialPath]}>
        <button type="button">Open navigation</button>
        <AdminSidebar {...resolvedProps} />
      </MemoryRouter>
    </I18nextProvider>,
  );

  return {
    ...view,
    rerenderSidebar(nextProps: Partial<AdminSidebarProps>) {
      view.rerender(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[initialPath]}>
            <button type="button">Open navigation</button>
            <AdminSidebar {...resolvedProps} {...nextProps} />
          </MemoryRouter>
        </I18nextProvider>,
      );
    },
  };
}

describe("AdminSidebar", () => {
  let mediaQuery: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    mediaQuery = installMatchMedia();
  });

  afterEach(() => {
    document.body.style.overflow = "";
    vi.unstubAllGlobals();
  });

  it("keeps the workspace identity concise in expanded navigation", async () => {
    await renderSidebar({
      desktopLayout: "expanded",
      workspaceName: "Acme Workspace",
    });

    expect(
      screen.getByRole("group", { name: /workspace: acme workspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI operations")).toBeInTheDocument();
  });

  it("renders grouped expanded navigation and toggles the desktop layout", async () => {
    const onToggleDesktop = vi.fn();
    await renderSidebar({ onToggleDesktop });

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(sidebar).toHaveAttribute("data-desktop-layout", "expanded");
    expect(sidebar).toHaveClass(
      "lg:w-64",
      "border-sidebar-border",
      "bg-sidebar",
      "text-sidebar-foreground",
    );
    expect(within(sidebar).getByText("FLAE")).toBeInTheDocument();
    expect(within(sidebar).getByText("AI operations")).toBeInTheDocument();
    expect(within(sidebar).getByText("FLAE Labs")).toBeInTheDocument();
    expect(within(sidebar).getByText("Focus")).toBeInTheDocument();
    expect(within(sidebar).getByText("Intelligence")).toBeInTheDocument();
    expect(within(sidebar).getByText("Workspace")).toBeInTheDocument();
    const statusCard = within(sidebar).getByRole("region", {
      name: "Indexing status",
    });
    expect(statusCard.parentElement).toHaveClass("hidden", "lg:block");
    const activeLink = within(sidebar).getByRole("link", { name: "Briefing" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink).toHaveClass("bg-brand", "text-brand-foreground");
    expect(activeLink.querySelector(".absolute")).toBeNull();

    await userEvent.click(
      within(sidebar).getByRole("button", { name: "Collapse navigation" }),
    );
    expect(onToggleDesktop).toHaveBeenCalledOnce();
  });

  it("keeps collapsed destinations named and exposes the expand control", async () => {
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(sidebar).toHaveAttribute("data-desktop-layout", "collapsed");
    expect(
      within(sidebar).getByRole("link", { name: "Knowledge Graph" }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
    expect(within(sidebar).queryByText("Indexing status")).not.toBeInTheDocument();
  });

  it("marks Overview as current only at the dashboard index", async () => {
    await renderSidebar({}, "/dashboard");

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(
      within(sidebar).getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Briefing" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("portals visual rail tooltips outside the scrolling navigation", async () => {
    const user = userEvent.setup();
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const navigation = within(sidebar).getByRole("navigation", {
      name: "Primary navigation",
    });
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue({
      bottom: 144,
      height: 44,
      left: 28,
      right: 72,
      top: 100,
      width: 44,
      x: 28,
      y: 100,
      toJSON: () => ({}),
    });

    expect(navigation).toHaveClass("overflow-y-auto");
    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();

    await user.hover(link);
    const hoveredTooltip = screen.getByTestId("admin-sidebar-tooltip");
    expect(hoveredTooltip).toHaveTextContent("Knowledge Graph");
    expect(hoveredTooltip).toHaveAttribute("aria-hidden", "true");
    expect(hoveredTooltip).toHaveClass("fixed");
    expect(hoveredTooltip).not.toHaveClass("admin-shell-theme");
    expect(hoveredTooltip).toHaveStyle({ left: "85px", top: "122px" });
    expect(sidebar).not.toContainElement(hoveredTooltip);

    await user.unhover(link);
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();

    fireEvent.focus(link);
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();
    fireEvent.blur(link);
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();
  });

  it("keeps a focused rail tooltip visible when the pointer leaves", async () => {
    const user = userEvent.setup();
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });

    fireEvent.focus(link);
    await user.hover(link);
    await user.unhover(link);
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();

    fireEvent.blur(link);
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();
  });

  it("keeps a hovered rail tooltip visible when the link blurs", async () => {
    const user = userEvent.setup();
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });

    await user.hover(link);
    fireEvent.focus(link);
    fireEvent.blur(link);
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();

    await user.unhover(link);
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();
  });

  it("clears mixed rail tooltip state when the desktop layout changes", async () => {
    const user = userEvent.setup();
    const view = await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });

    fireEvent.focus(link);
    await user.hover(link);
    expect(screen.getByTestId("admin-sidebar-tooltip")).toBeInTheDocument();

    view.rerenderSidebar({ desktopLayout: "expanded" });
    expect(
      screen.queryByTestId("admin-sidebar-tooltip"),
    ).not.toBeInTheDocument();

    view.rerenderSidebar({ desktopLayout: "collapsed" });
    expect(
      screen.queryByTestId("admin-sidebar-tooltip"),
    ).not.toBeInTheDocument();
  });

  it("clears a visible rail tooltip when navigation scrolls", async () => {
    const user = userEvent.setup();
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const navigation = within(sidebar).getByRole("navigation", {
      name: "Primary navigation",
    });
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });

    await user.hover(link);
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();

    fireEvent.scroll(navigation);
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();
  });

  it("clears a visible rail tooltip when the viewport resizes", async () => {
    const user = userEvent.setup();
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const link = within(sidebar).getByRole("link", {
      name: "Knowledge Graph",
    });

    await user.hover(link);
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();

    fireEvent(window, new Event("resize"));
    expect(screen.queryByText("Knowledge Graph")).not.toBeInTheDocument();
  });

  it("gives the collapsed workspace identity valid named semantics", async () => {
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(
      within(sidebar).getByRole("group", { name: "Workspace: FLAE Labs" }),
    ).toBeInTheDocument();
  });

  it("mounts the mobile dialog only while open and manages focus and scroll", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    document.body.style.overflow = "clip";
    const view = await renderSidebar({ onCloseMobile });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    view.rerenderSidebar({ mobileOpen: true, onCloseMobile });

    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(dialog).toHaveClass("w-64", "bg-sidebar", "text-sidebar-foreground");
    expect(within(dialog).queryByText("Indexing status")).not.toBeInTheDocument();
    const closeButton = within(dialog).getByRole("button", {
      name: "Close navigation",
    });
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    await user.tab({ shift: true });
    expect(
      within(dialog).getByRole("link", { name: "Settings" }),
    ).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onCloseMobile).toHaveBeenCalledOnce();
    view.rerenderSidebar({ mobileOpen: false, onCloseMobile });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("closes and restores the mobile drawer lifecycle at the tablet breakpoint", async () => {
    const onCloseMobile = vi.fn();
    document.body.style.overflow = "clip";
    const view = await renderSidebar({ onCloseMobile });
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    view.rerenderSidebar({ mobileOpen: true, onCloseMobile });

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Close navigation",
        }),
      ).toHaveFocus(),
    );
    expect(document.body.style.overflow).toBe("hidden");

    mediaQuery.emit(true);
    expect(onCloseMobile).toHaveBeenCalledOnce();
    view.rerenderSidebar({ mobileOpen: false, onCloseMobile });
    expect(document.body.style.overflow).toBe("clip");
    expect(trigger).not.toHaveFocus();
  });

  it("closes the mobile drawer from the backdrop", async () => {
    const onCloseMobile = vi.fn();
    await renderSidebar({ mobileOpen: true, onCloseMobile });

    await userEvent.click(
      screen.getByRole("button", { name: "Close navigation overlay" }),
    );

    expect(onCloseMobile).toHaveBeenCalledOnce();
  });

  it("closes the mobile drawer when a destination is selected", async () => {
    const onCloseMobile = vi.fn();
    await renderSidebar({ mobileOpen: true, onCloseMobile });

    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    await userEvent.click(within(dialog).getByRole("link", { name: "Chat" }));

    expect(onCloseMobile).toHaveBeenCalledOnce();
  });

  it("marks only the most-specific matching destination as current", async () => {
    await renderSidebar({}, "/dashboard/knowledge/graph/entity-1");

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(
      within(sidebar).getByRole("link", { name: "Knowledge Graph" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Knowledge" }),
    ).not.toHaveAttribute("aria-current");
  });
});
