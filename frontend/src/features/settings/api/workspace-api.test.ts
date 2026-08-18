import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../../core/api/client";
import * as workspaceApi from "./workspace-api";
import { listWorkspaces, selectWorkspace } from "./workspace-api";

type WorkspaceApiFunction = (...args: unknown[]) => Promise<unknown>;

function getApiFunction(name: string) {
  const candidate = (workspaceApi as Record<string, unknown>)[name];
  expect(candidate, `${name} must be implemented`).toBeTypeOf("function");
  return candidate as WorkspaceApiFunction;
}

const backendUserItem = {
  code: "",
  message: "",
  id: "user-1",
  firebase_uid: "firebase-1",
  email: "owner@example.com",
  full_name: "Owner",
  is_active: true,
  login_providers: ["google"],
  avatar_url: null,
  current_workspace_id: "ws-2",
};

describe("workspace API", () => {
  it("uses the actual backend workspace response schema", async () => {
    const request = vi
      .fn()
      .mockResolvedValue([
        {
          id: "ws-1",
          name: "Platform",
          owner_uid: "firebase-1",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]);

    await expect(listWorkspaces({ request } as ApiClient)).resolves.toEqual([
      {
        id: "ws-1",
        name: "Platform",
        owner_uid: "firebase-1",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: "/workspaces",
    });
  });

  it("never issues a malformed request without a workspace ID", async () => {
    const request = vi.fn();

    await expect(
      selectWorkspace(null, { request } as ApiClient),
    ).rejects.toThrow("workspace");
    expect(request).not.toHaveBeenCalled();
  });

  it("sends the managed workspace header option and validates the full FastAPI user fixture", async () => {
    const request = vi.fn().mockResolvedValue(backendUserItem);

    await expect(
      selectWorkspace("ws-2", { request } as ApiClient),
    ).resolves.toMatchObject({
      id: "user-1",
      current_workspace_id: "ws-2",
      firebase_uid: "firebase-1",
    });
    expect(request).toHaveBeenCalledWith({
      auth: true,
      body: { workspace_id: "ws-2" },
      method: "PUT",
      path: "/users/current-workspace",
      workspaceId: "ws-2",
    });
  });

  it("rejects incomplete nested UserItemResponse data", async () => {
    const invalid = {
      code: "",
      message: "",
      id: "user-1",
      email: "owner@example.com",
      full_name: "Owner",
      is_active: true,
      login_providers: ["google"],
      avatar_url: null,
      current_workspace_id: "ws-2",
    };
    const request = vi.fn().mockResolvedValue(invalid);
    const error: unknown = await selectWorkspace("ws-2", {
      request,
    } as ApiClient).catch((cause: unknown) => cause);
    expect(error).toMatchObject({
      kind: "server",
      message: "The server returned invalid account data.",
    });
    if (typeof error !== "object" || error === null)
      throw new Error("Expected an AppError");
    expect(Object.hasOwn(error, "cause")).toBe(false);
  });

  it("does not retain malformed workspace payloads in the safe validation error", async () => {
    const request = vi
      .fn()
      .mockResolvedValue([
        { id: "", name: "Private Workspace", owner_uid: "owner@example.com" },
      ]);
    const error: unknown = await listWorkspaces({ request } as ApiClient).catch(
      (cause: unknown) => cause,
    );

    expect(error).toMatchObject({
      kind: "server",
      message: "The server returned invalid workspace data.",
    });
    if (!(error instanceof Error)) throw new Error("Expected an AppError");
    expect(Object.hasOwn(error, "cause")).toBe(false);
    expect(error.message).not.toContain("Private Workspace");
    expect(error.message).not.toContain("owner@example.com");
  });

  it("preserves workspace create and update contracts", async () => {
    const workspace = {
      id: "ws-1",
      name: "Platform",
      owner_uid: "firebase-1",
      created_at: null,
    };
    const request = vi.fn().mockResolvedValue(workspace);
    const client = { request } as ApiClient;

    await expect(
      getApiFunction("createManualWorkspace")({ name: "Platform" }, client),
    ).resolves.toEqual(workspace);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      body: { name: "Platform" },
      method: "POST",
      path: "/workspaces/manual",
    });

    await expect(
      getApiFunction("updateWorkspace")("ws-1", { name: "Platform" }, client),
    ).resolves.toEqual(workspace);
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: { name: "Platform" },
      method: "PUT",
      path: "/workspaces/ws-1",
      workspaceId: "ws-1",
    });
  });

  it("preserves member and invitation list contracts", async () => {
    const member = {
      workspace_id: "ws-1",
      user_uid: "member-1",
      role: "member",
      status: "active",
      email: "member@example.com",
      full_name: "Member One",
      avatar_url: null,
    };
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
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce([member])
      .mockResolvedValueOnce([invitation]);
    const client = { request } as ApiClient;

    await expect(
      getApiFunction("listWorkspaceMembers")("ws-1", client),
    ).resolves.toEqual([member]);
    await expect(
      getApiFunction("listPendingInvitations")("ws-1", client),
    ).resolves.toEqual([invitation]);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      method: "GET",
      path: "/workspaces/ws-1/members",
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      method: "GET",
      path: "/workspaces/ws-1/invitations",
      workspaceId: "ws-1",
    });
  });

  it("preserves invitation acceptance and member mutation contracts", async () => {
    const workspace = {
      id: "ws-2",
      name: "Research",
      owner_uid: "owner-2",
      created_at: null,
    };
    const member = {
      workspace_id: "ws-1",
      user_uid: "member-1",
      role: "admin",
      status: "active",
      email: "member@example.com",
      full_name: "Member One",
      avatar_url: null,
    };
    const invitation = {
      id: "invite-1",
      workspace_id: "ws-1",
      email: "guest@example.com",
      role: "member",
      token: "invite-token",
      invited_by: "firebase-1",
      status: "pending",
      expires_at: "2026-08-01T00:00:00Z",
      created_at: "2026-07-24T00:00:00Z",
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(workspace)
      .mockResolvedValueOnce(member)
      .mockResolvedValueOnce(true);
    const client = { request } as ApiClient;

    await expect(
      getApiFunction("inviteWorkspaceMember")(
        "ws-1",
        { email: "guest@example.com", role: "member" },
        client,
      ),
    ).resolves.toEqual(invitation);
    await expect(
      getApiFunction("acceptWorkspaceInvitation")(
        { token: "invite-token" },
        client,
      ),
    ).resolves.toEqual(workspace);
    await expect(
      getApiFunction("updateWorkspaceMember")(
        "ws-1",
        "member-1",
        { role: "admin", status: "active" },
        client,
      ),
    ).resolves.toEqual(member);
    await expect(
      getApiFunction("removeWorkspaceMember")("ws-1", "member-1", client),
    ).resolves.toBe(true);

    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      body: { email: "guest@example.com", role: "member" },
      method: "POST",
      path: "/workspaces/ws-1/invitations",
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: { token: "invite-token" },
      method: "POST",
      path: "/workspaces/invitations/accept",
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      auth: true,
      body: { role: "admin", status: "active" },
      method: "PUT",
      path: "/workspaces/ws-1/members/member-1",
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(4, {
      auth: true,
      method: "DELETE",
      path: "/workspaces/ws-1/members/member-1",
      workspaceId: "ws-1",
    });
  });

  it("preserves optional workspace OAuth contracts", async () => {
    const workspace = {
      id: "ws-3",
      name: "Connected",
      owner_uid: "firebase-1",
      created_at: null,
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce({ oauth_url: "https://provider.example/connect" })
      .mockResolvedValueOnce(workspace);
    const client = { request } as ApiClient;

    await expect(
      getApiFunction("getWorkspaceOauthUrl")(
        { platform: "google", redirect_uri: "https://app.example/callback" },
        client,
      ),
    ).resolves.toEqual({ oauth_url: "https://provider.example/connect" });
    await expect(
      getApiFunction("handleWorkspaceOauthCallback")(
        { code: "code-1", state: "state-1", platform: "google" },
        client,
      ),
    ).resolves.toEqual(workspace);
  });
});
