import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import type { User } from "../../core/auth/user-schema";
import type { Workspace } from "../../features/settings/types/workspace";
import { createI18n } from "../../shared/i18n";
import { AdminHeader, type AdminHeaderProps } from "./AdminHeader";

const resources = {
  en: {
    translation: {
      COMMON: {
        LANGUAGE: "Language",
        LOGOUT: "Log out",
      },
      SHELL: {
        ADD_SOURCE: "Add source",
        DEMO_ONLY: "Preview only; this action is not connected yet.",
        LOADING_WORKSPACES: "Loading workspaces",
        LOGGING_OUT: "Signing out",
        NO_WORKSPACE: "No workspace",
        OPEN_NAV: "Open navigation",
        WORKSPACE: "Workspace",
      },
    },
  },
};

const user: User = {
  avatar_url: null,
  current_workspace_id: "workspace-1",
  email: "owner@example.com",
  firebase_uid: "firebase-1",
  full_name: "Workspace Owner",
  id: "user-1",
  is_active: true,
  login_providers: ["google"],
};

const workspaces: Workspace[] = [
  {
    created_at: null,
    id: "workspace-1",
    name: "Platform",
    owner_uid: "user-1",
  },
  {
    created_at: null,
    id: "workspace-2",
    name: "Research",
    owner_uid: "user-1",
  },
];

function createProps(
  overrides: Partial<AdminHeaderProps> = {},
): AdminHeaderProps {
  return {
    currentWorkspaceId: "workspace-1",
    language: "en",
    onChangeLanguage: vi.fn(),
    onOpenNavigation: vi.fn(),
    onSelectWorkspace: vi.fn(),
    pageLabel: "Knowledge Graph",
    sectionLabel: "Intelligence",
    syncStatus: "idle",
    user,
    workspaces,
    workspacesPending: false,
    ...overrides,
  };
}

async function renderHeader(props: AdminHeaderProps) {
  const i18n = await createI18n(resources, "en");
  return render(
    <I18nextProvider i18n={i18n}>
      <AdminHeader {...props} />
    </I18nextProvider>,
  );
}

describe("AdminHeader", () => {
  it("renders the header without a search input and marks unavailable actions as inert", async () => {
    await renderHeader(createProps());

    expect(screen.getByRole("banner")).toHaveClass("h-16");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MCP" })).toBeDisabled();
    const addSourceButton = screen.getByRole("button", { name: "Add source" });
    expect(addSourceButton).toBeDisabled();
    expect(addSourceButton).toHaveClass(
      "header-add-source",
      "bg-primary-control",
      "text-primary-control-foreground",
    );
    expect(screen.getByTestId("mcp-status-indicator")).toHaveClass(
      "bg-chart-2",
    );
  });

  it("preserves workspace, language, user, and logout controls", async () => {
    await renderHeader(
      createProps({
        logoutController: {
          error: null,
          isLoading: false,
          logout: vi.fn().mockResolvedValue(undefined),
        },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    expect(
      screen.getByRole("combobox", { name: "Workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Language" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("WO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("groups page context separately from workspace and user utilities", async () => {
    await renderHeader(
      createProps({
        pageLabel: "Knowledge base",
        sectionLabel: "Intelligence",
        user: { ...user, full_name: "Nguyen Vinh" },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "NV" }));

    expect(screen.getByText("Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Knowledge base")).toBeInTheDocument();
    expect(screen.getByLabelText("NV")).toHaveTextContent("NV");
    expect(
      screen.getByRole("combobox", { name: /workspace/i }),
    ).toBeInTheDocument();
  });

  it("shows the page context and opens mobile navigation", async () => {
    const onOpenNavigation = vi.fn();
    await renderHeader(createProps({ onOpenNavigation }));

    expect(screen.getByText("Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Graph")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Open navigation" }),
    );
    expect(onOpenNavigation).toHaveBeenCalledOnce();
  });

  it("reports workspace and language selections", async () => {
    const onChangeLanguage = vi.fn();
    const onSelectWorkspace = vi.fn();
    await renderHeader(createProps({ onChangeLanguage, onSelectWorkspace }));

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Workspace" }),
      "workspace-2",
    );
    expect(onSelectWorkspace).toHaveBeenCalledWith("workspace-2");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Language" }),
      "vi",
    );
    expect(onChangeLanguage).toHaveBeenCalledWith("vi");
  });

  it("announces workspace loading", async () => {
    await renderHeader(createProps({ workspacesPending: true }));

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    expect(
      screen.getByRole("status", { name: "Loading workspaces" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Workspace" }),
    ).not.toBeInTheDocument();
  });

  it("disables and names an empty workspace selector", async () => {
    await renderHeader(
      createProps({ currentWorkspaceId: null, workspaces: [] }),
    );

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    const selector = screen.getByRole("combobox", { name: "Workspace" });
    expect(selector).toBeDisabled();
    expect(selector).toHaveDisplayValue("No workspace");
  });

  it("disables workspace changes while synchronization is active", async () => {
    await renderHeader(createProps({ syncStatus: "syncing" }));

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    expect(screen.getByRole("combobox", { name: "Workspace" })).toBeDisabled();
  });

  it("logs out when the optional control is activated", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    await renderHeader(
      createProps({
        logoutController: { error: null, isLoading: false, logout },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it("keeps the logout name stable while exposing its pending state", async () => {
    await renderHeader(
      createProps({
        logoutController: {
          error: null,
          isLoading: true,
          logout: vi.fn().mockResolvedValue(undefined),
        },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "WO" }));

    const logoutButton = screen.getByRole("button", { name: "Log out" });
    expect(logoutButton).toBeDisabled();
    expect(logoutButton).toHaveAttribute("aria-busy", "true");
    expect(logoutButton).toHaveTextContent("Signing out");
  });

  it("closes the profile menu when pressing Escape and restores focus to avatar button", async () => {
    await renderHeader(createProps());

    const avatarButton = screen.getByRole("button", { name: "WO" });
    await userEvent.click(avatarButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(avatarButton).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(avatarButton).toHaveAttribute("aria-expanded", "false");
    expect(avatarButton).toHaveFocus();
  });

  it("closes the profile menu when clicking outside", async () => {
    await renderHeader(createProps());

    const avatarButton = screen.getByRole("button", { name: "WO" });
    await userEvent.click(avatarButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(avatarButton).toHaveAttribute("aria-expanded", "false");
  });

  it("displays user information cleanly in the profile menu header", async () => {
    await renderHeader(
      createProps({
        user: { ...user, full_name: "Nguyen Vinh", email: "vinh@flae.ai" },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "NV" }));

    expect(screen.getByText("Nguyen Vinh")).toBeInTheDocument();
    expect(screen.getByText("vinh@flae.ai")).toBeInTheDocument();
  });
});
