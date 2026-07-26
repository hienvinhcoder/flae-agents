import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
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

function renderSettings(path = "/dashboard/settings") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.workspaces, [workspace]);
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
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

  it("uses the tab query parameter and loads members and invitations", async () => {
    renderSettings("/dashboard/settings?tab=members");

    expect(screen.getByRole("tab", { name: /members/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
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

  it("validates an invitation before submitting it", async () => {
    const user = userEvent.setup();
    runtimeApi.inviteWorkspaceMember.mockResolvedValue(invitation);
    renderSettings("/dashboard/settings?tab=members");
    await screen.findByText("member@example.com");

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
    await screen.findByText("member@example.com");

    fireEvent.change(
      screen.getByRole("combobox", { name: /role for member one/i }),
      { target: { value: "viewer" } },
    );
    await waitFor(() =>
      expect(runtimeApi.updateWorkspaceMember).toHaveBeenCalledWith(
        "ws-1",
        "member-1",
        { role: "viewer", status: "active" },
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /remove member one/i }));
    expect(runtimeApi.removeWorkspaceMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /remove member one/i }));
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

    expect(await screen.findByText("member@example.com")).toBeInTheDocument();
    expect(
      await screen.findByText("Invitations are unavailable."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry invitations/i }),
    ).toBeInTheDocument();
  });

  it("keeps the invite dialog open and exposes a retryable mutation error", async () => {
    const user = userEvent.setup();
    runtimeApi.inviteWorkspaceMember.mockRejectedValue(
      new Error("Invitation could not be sent."),
    );
    renderSettings("/dashboard/settings?tab=members");
    await screen.findByText("member@example.com");

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
      screen.getByRole("dialog", { name: /invite member/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send invitation/i }),
    ).toBeEnabled();
  });
});
