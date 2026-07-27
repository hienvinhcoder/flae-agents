import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

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
        REPORTS: "Reports",
        SETTINGS: "Settings",
        TOPICS: "Topics",
      },
      SHELL: {
        BRAND_SUBTITLE: "Company memory",
        CLOSE_NAV: "Close navigation",
        CLOSE_NAV_OVERLAY: "Close navigation overlay",
        COLLAPSE_NAV: "Collapse navigation",
        EXPAND_NAV: "Expand navigation",
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
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders grouped expanded navigation and toggles the desktop layout", async () => {
    const onToggleDesktop = vi.fn();
    await renderSidebar({ onToggleDesktop });

    const sidebar = screen.getByTestId("admin-sidebar");
    expect(sidebar).toHaveAttribute("data-desktop-layout", "expanded");
    expect(within(sidebar).getByText("FLAE")).toBeInTheDocument();
    expect(within(sidebar).getByText("Company memory")).toBeInTheDocument();
    expect(within(sidebar).getByText("FLAE Labs")).toBeInTheDocument();
    expect(within(sidebar).getByText("Focus")).toBeInTheDocument();
    expect(within(sidebar).getByText("Intelligence")).toBeInTheDocument();
    expect(within(sidebar).getByText("Workspace")).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("link", { name: "Briefing" }),
    ).toHaveAttribute("aria-current", "page");

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
  });

  it("lets desktop rail tooltips escape the navigation container", async () => {
    await renderSidebar({ desktopLayout: "collapsed" });

    const sidebar = screen.getByTestId("admin-sidebar");
    const navigation = within(sidebar).getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(navigation).toHaveClass("overflow-visible");
    expect(navigation).not.toHaveClass("overflow-y-auto");
    expect(
      within(sidebar).getByRole("tooltip", { name: "Knowledge Graph" }),
    ).toBeInTheDocument();
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
