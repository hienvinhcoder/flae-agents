import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { i18n as I18nInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { AppError } from "../../../core/api/errors";
import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { createI18n } from "../../../shared/i18n";
import { queryKeys } from "../../../shared/lib/query-keys";
import { SettingsPage } from "./SettingsPage";

const runtimeApi = vi.hoisted(() => ({
  createManualWorkspace: vi.fn(),
  inviteWorkspaceMember: vi.fn(),
  listPendingInvitations: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  updateWorkspace: vi.fn(),
  updateWorkspaceMember: vi.fn(),
}));

vi.mock("../api/workspace-runtime-api", () => runtimeApi);

const workspace = {
  id: "ws-1",
  name: "Platform",
  owner_uid: "firebase-1",
  created_at: null,
};
const secondWorkspace = {
  ...workspace,
  id: "ws-2",
  name: "Research",
};
const owner = {
  workspace_id: "ws-1",
  user_uid: "firebase-1",
  email: "owner@example.com",
  full_name: "Owner",
  avatar_url: null,
  role: "owner",
  status: "active",
} as const;
const member = {
  workspace_id: "ws-1",
  user_uid: "member-1",
  email: "member@example.com",
  full_name: "Member One",
  avatar_url: null,
  role: "member",
  status: "active",
} as const;
const invitation = {
  id: "invite-1",
  workspace_id: "ws-1",
  email: "guest@example.com",
  role: "viewer",
  token: "invite-token",
  invited_by: "firebase-1",
  status: "pending",
  expires_at: "2026-08-01T00:00:00Z",
  created_at: "2026-07-24T00:00:00Z",
} as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function renderSettings(
  path = "/dashboard/settings",
  i18n?: I18nInstance,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.workspaces, [workspace, secondWorkspace]);
  const page = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  render(
    i18n ? (
      <I18nextProvider i18n={i18n}>{page}</I18nextProvider>
    ) : (
      <TestI18nProvider>{page}</TestI18nProvider>
    ),
  );
  return queryClient;
}

describe("SettingsPage", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.listWorkspaceMembers.mockResolvedValue([owner, member]);
    runtimeApi.listPendingInvitations.mockResolvedValue([invitation]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
    useAuthStore.getState().setAuthenticated({
      id: "user-1",
      firebase_uid: "firebase-1",
      email: "owner@example.com",
      full_name: "Owner",
      is_active: true,
      login_providers: ["google"],
      avatar_url: null,
      current_workspace_id: "ws-1",
    });
  });

  it("renders settings as one Configuration page with URL-backed sections", async () => {
    renderSettings("/dashboard/settings?tab=members");

    expect(
      screen.getByRole("heading", { level: 1, name: /workspace settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /members/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      await screen.findByRole("heading", { level: 2, name: /members/i }),
    ).toBeInTheDocument();
  });

  it("renders member identity, role, status, and actions in a mobile summary", async () => {
    renderSettings("/dashboard/settings?tab=members");

    const summary = await screen.findByRole("article", {
      name: member.full_name,
    });
    expect(summary).toHaveTextContent(member.email);
    expect(
      within(summary).getByRole("combobox", { name: /role/i }),
    ).toBeInTheDocument();
    expect(summary).toHaveTextContent("Active");
    expect(
      within(summary).getByRole("button", { name: /remove member one/i }),
    ).toBeInTheDocument();
  });

  it("uses the tab query parameter and loads members and invitations", async () => {
    renderSettings("/dashboard/settings?tab=members");

    expect(screen.getByRole("tab", { name: /members/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findAllByText("member@example.com")).toHaveLength(2);
    expect(await screen.findByText("guest@example.com")).toBeInTheDocument();
    expect(runtimeApi.listWorkspaceMembers).toHaveBeenCalledWith("ws-1");
    expect(runtimeApi.listPendingInvitations).toHaveBeenCalledWith("ws-1");
  });

  it("validates and submits a workspace rename", async () => {
    const user = userEvent.setup();
    runtimeApi.updateWorkspace.mockResolvedValue({
      ...workspace,
      name: "Platform Lab",
    });
    renderSettings();

    const input = screen.getByRole("textbox", { name: /workspace name/i });
    await user.clear(input);
    await user.type(input, "A");
    await user.click(screen.getByRole("button", { name: /save workspace/i }));
    expect(
      await screen.findByText(/at least 3 characters/i),
    ).toBeInTheDocument();
    expect(runtimeApi.updateWorkspace).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "Platform Lab");
    await user.click(screen.getByRole("button", { name: /save workspace/i }));
    await waitFor(() =>
      expect(runtimeApi.updateWorkspace).toHaveBeenCalledWith("ws-1", {
        name: "Platform Lab",
      }),
    );
  });

  it("does not replace a newly selected workspace after a stale create completes", async () => {
    const user = userEvent.setup();
    const createRequest = deferred<typeof workspace>();
    runtimeApi.createManualWorkspace.mockReturnValueOnce(createRequest.promise);
    renderSettings("/dashboard/settings?mode=create");

    await user.type(
      screen.getByRole("textbox", { name: /workspace name/i }),
      "Product Lab",
    );
    await user.click(screen.getByRole("button", { name: /save workspace/i }));
    await waitFor(() =>
      expect(runtimeApi.createManualWorkspace).toHaveBeenCalledWith(
        { name: "Product Lab" },
        expect.anything(),
      ),
    );

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2"));
    await act(async () => {
      createRequest.resolve({
        ...workspace,
        id: "ws-created",
        name: "Product Lab",
      });
      await createRequest.promise;
    });

    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-2");
  });

  it("validates an invitation before submitting it", async () => {
    const user = userEvent.setup();
    runtimeApi.inviteWorkspaceMember.mockResolvedValue(invitation);
    renderSettings("/dashboard/settings?tab=members");
    await screen.findAllByText("member@example.com");

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: /send invitation/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(runtimeApi.inviteWorkspaceMember).not.toHaveBeenCalled();

    await user.clear(screen.getByRole("textbox", { name: /email/i }));
    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "new@example.com",
    );
    await user.click(screen.getByRole("button", { name: /send invitation/i }));
    await waitFor(() =>
      expect(runtimeApi.inviteWorkspaceMember).toHaveBeenCalledWith("ws-1", {
        email: "new@example.com",
        role: "member",
      }),
    );
  });

  it("updates a member role and confirms member removal", async () => {
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    runtimeApi.updateWorkspaceMember.mockResolvedValue({
      ...member,
      role: "viewer",
    });
    runtimeApi.removeWorkspaceMember.mockResolvedValue(true);
    renderSettings("/dashboard/settings?tab=members");
    const memberSummary = await screen.findByRole("article", {
      name: member.full_name,
    });

    fireEvent.change(
      within(memberSummary).getByRole("combobox", {
        name: /role for member one/i,
      }),
      { target: { value: "viewer" } },
    );
    await waitFor(() =>
      expect(runtimeApi.updateWorkspaceMember).toHaveBeenCalledWith(
        "ws-1",
        "member-1",
        { role: "viewer", status: "active" },
      ),
    );

    const removeButton = within(memberSummary).getByRole("button", {
      name: /remove member one/i,
    });
    fireEvent.click(removeButton);
    expect(runtimeApi.removeWorkspaceMember).not.toHaveBeenCalled();
    fireEvent.click(removeButton);
    await waitFor(() =>
      expect(runtimeApi.removeWorkspaceMember).toHaveBeenCalledWith(
        "ws-1",
        "member-1",
      ),
    );
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("keeps the member list available when pending invitations cannot be loaded", async () => {
    runtimeApi.listPendingInvitations.mockRejectedValue(
      new Error("Invitations are unavailable."),
    );
    renderSettings("/dashboard/settings?tab=members");

    expect(await screen.findAllByText("member@example.com")).toHaveLength(2);
    expect(
      await screen.findByText("Invitations are unavailable."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry invitations/i }),
    ).toBeInTheDocument();
  });

  it("keeps infrastructure details private and leaves global failures globally announced", async () => {
    runtimeApi.listWorkspaceMembers.mockRejectedValueOnce(
      new AppError({
        kind: "network",
        message: "Raw connection details",
        retryable: true,
      }),
    );
    renderSettings("/dashboard/settings?tab=members");

    expect(
      await screen.findAllByText("Unable to load workspace members"),
    ).toHaveLength(2);
    expect(screen.queryByText("Raw connection details")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the invite dialog open and exposes a retryable mutation error", async () => {
    const user = userEvent.setup();
    runtimeApi.inviteWorkspaceMember.mockRejectedValue(
      new Error("Invitation could not be sent."),
    );
    renderSettings("/dashboard/settings?tab=members");
    await screen.findAllByText("member@example.com");

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(
      screen.getByRole("textbox", { name: /email/i }),
      "new@example.com",
    );
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invitation could not be sent.",
    );
    expect(
      screen.getByRole("dialog", { name: /invite workspace member/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send invitation/i }),
    ).toBeEnabled();
  });

  it("resets member interaction state when the workspace context changes", async () => {
    const user = userEvent.setup();
    renderSettings("/dashboard/settings?tab=members");
    await screen.findAllByText("member@example.com");

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    expect(
      screen.getByRole("dialog", { name: /invite workspace member/i }),
    ).toBeInTheDocument();

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2"));

    await waitFor(() =>
      expect(runtimeApi.listWorkspaceMembers).toHaveBeenCalledWith("ws-2"),
    );
    await screen.findAllByText("member@example.com");
    expect(
      screen.queryByRole("dialog", { name: /invite workspace member/i }),
    ).not.toBeInTheDocument();
  });

  it("updates touched copy and validation when the live locale changes", async () => {
    const user = userEvent.setup();
    const i18n = await createI18n(
      {
        en: { translation: en },
        vi: { translation: viMessages },
      },
      "en",
    );
    renderSettings("/dashboard/settings?tab=members", i18n);
    const summary = await screen.findByRole("article", {
      name: member.full_name,
    });
    expect(summary).toHaveTextContent("Active");

    await act(() => i18n.changeLanguage("vi"));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Cấu hình không gian làm việc",
      }),
    ).toBeInTheDocument();
    expect(summary).toHaveTextContent("Hoạt động");
    await user.click(screen.getByRole("button", { name: "Mời thành viên" }));
    await user.type(
      screen.getByRole("textbox", { name: "Địa chỉ email" }),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: "Gửi lời mời" }));
    expect(
      await screen.findByText("Nhập địa chỉ email hợp lệ."),
    ).toBeInTheDocument();
  });

});
