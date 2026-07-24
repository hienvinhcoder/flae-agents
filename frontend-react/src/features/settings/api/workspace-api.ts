import { AppError } from "../../../core/api/errors";
import type { ApiClient } from "../../../core/api/client";
import {
  userItemResponseSchema,
  type User,
} from "../../../core/auth/user-schema";
import {
  workspaceInvitationSchema,
  workspaceMemberSchema,
  workspaceOauthUrlSchema,
  workspaceSchema,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceInvitationPayload,
  type WorkspaceMember,
  type WorkspaceMemberUpdatePayload,
  type WorkspaceNamePayload,
  type WorkspaceOauthCallbackPayload,
  type WorkspaceOauthUrl,
  type WorkspaceOauthUrlPayload,
} from "../types/workspace";

function requireWorkspaceId(workspaceId: string | null) {
  if (!workspaceId?.trim()) {
    throw new AppError({
      kind: "validation",
      message: "A workspace is required before making this request.",
      retryable: false,
    });
  }
  return workspaceId;
}

function invalidData(message: string) {
  return new AppError({ kind: "server", message, retryable: false });
}

function parseWorkspace(data: unknown) {
  const result = workspaceSchema.safeParse(data);
  if (!result.success)
    throw invalidData("The server returned invalid workspace data.");
  return result.data;
}

export async function listWorkspaces(client: ApiClient): Promise<Workspace[]> {
  const data = await client.request<unknown>({
    auth: true,
    method: "GET",
    path: "/workspaces",
  });
  const result = workspaceSchema.array().safeParse(data);
  if (!result.success) {
    throw new AppError({
      kind: "server",
      message: "The server returned invalid workspace data.",
      retryable: false,
    });
  }
  return result.data;
}

export async function selectWorkspace(
  workspaceId: string | null,
  client: ApiClient,
): Promise<User> {
  const selectedWorkspaceId = requireWorkspaceId(workspaceId);
  const data = await client.request<unknown>({
    auth: true,
    body: { workspace_id: selectedWorkspaceId },
    method: "PUT",
    path: "/users/current-workspace",
    workspaceId: selectedWorkspaceId,
  });
  const result = userItemResponseSchema.safeParse(data);
  if (!result.success) {
    throw new AppError({
      kind: "server",
      message: "The server returned invalid account data.",
      retryable: false,
    });
  }
  return result.data;
}

export async function createManualWorkspace(
  payload: WorkspaceNamePayload,
  client: ApiClient,
): Promise<Workspace> {
  return parseWorkspace(
    await client.request<unknown>({
      auth: true,
      body: { name: payload.name },
      method: "POST",
      path: "/workspaces/manual",
    }),
  );
}

export async function updateWorkspace(
  workspaceId: string | null,
  payload: WorkspaceNamePayload,
  client: ApiClient,
): Promise<Workspace> {
  const id = requireWorkspaceId(workspaceId);
  return parseWorkspace(
    await client.request<unknown>({
      auth: true,
      body: { name: payload.name },
      method: "PUT",
      path: `/workspaces/${id}`,
      workspaceId: id,
    }),
  );
}

export async function listWorkspaceMembers(
  workspaceId: string | null,
  client: ApiClient,
): Promise<WorkspaceMember[]> {
  const id = requireWorkspaceId(workspaceId);
  const result = workspaceMemberSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `/workspaces/${id}/members`,
      workspaceId: id,
    }),
  );
  if (!result.success)
    throw invalidData("The server returned invalid workspace member data.");
  return result.data;
}

export async function listPendingInvitations(
  workspaceId: string | null,
  client: ApiClient,
): Promise<WorkspaceInvitation[]> {
  const id = requireWorkspaceId(workspaceId);
  const result = workspaceInvitationSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `/workspaces/${id}/invitations`,
      workspaceId: id,
    }),
  );
  if (!result.success)
    throw invalidData("The server returned invalid workspace invitation data.");
  return result.data;
}

export async function inviteWorkspaceMember(
  workspaceId: string | null,
  payload: WorkspaceInvitationPayload,
  client: ApiClient,
): Promise<WorkspaceInvitation> {
  const id = requireWorkspaceId(workspaceId);
  const result = workspaceInvitationSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      body: { email: payload.email, role: payload.role },
      method: "POST",
      path: `/workspaces/${id}/invitations`,
      workspaceId: id,
    }),
  );
  if (!result.success)
    throw invalidData("The server returned invalid workspace invitation data.");
  return result.data;
}

export async function acceptWorkspaceInvitation(
  payload: { token: string },
  client: ApiClient,
): Promise<Workspace> {
  return parseWorkspace(
    await client.request<unknown>({
      auth: true,
      body: { token: payload.token },
      method: "POST",
      path: "/workspaces/invitations/accept",
    }),
  );
}

export async function updateWorkspaceMember(
  workspaceId: string | null,
  userUid: string,
  payload: WorkspaceMemberUpdatePayload,
  client: ApiClient,
): Promise<WorkspaceMember> {
  const id = requireWorkspaceId(workspaceId);
  const result = workspaceMemberSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      body: { role: payload.role, status: payload.status },
      method: "PUT",
      path: `/workspaces/${id}/members/${userUid}`,
      workspaceId: id,
    }),
  );
  if (!result.success)
    throw invalidData("The server returned invalid workspace member data.");
  return result.data;
}

export async function removeWorkspaceMember(
  workspaceId: string | null,
  userUid: string,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const result = await client.request<unknown>({
    auth: true,
    method: "DELETE",
    path: `/workspaces/${id}/members/${userUid}`,
    workspaceId: id,
  });
  if (typeof result !== "boolean")
    throw invalidData("The server returned invalid member removal data.");
  return result;
}

export async function getWorkspaceOauthUrl(
  payload: WorkspaceOauthUrlPayload,
  client: ApiClient,
): Promise<WorkspaceOauthUrl> {
  const body: Record<string, string> = { platform: payload.platform };
  if (payload.redirect_uri) body.redirect_uri = payload.redirect_uri;
  const result = workspaceOauthUrlSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      body,
      method: "POST",
      path: "/workspaces/oauth/url",
    }),
  );
  if (!result.success)
    throw invalidData("The server returned invalid OAuth data.");
  return result.data;
}

export async function handleWorkspaceOauthCallback(
  payload: WorkspaceOauthCallbackPayload,
  client: ApiClient,
): Promise<Workspace> {
  const body = {
    code: payload.code,
    ...(payload.state ? { state: payload.state } : {}),
    ...(payload.platform ? { platform: payload.platform } : {}),
  };
  return parseWorkspace(
    await client.request<unknown>({
      auth: true,
      body,
      method: "POST",
      path: "/workspaces/oauth/callback",
    }),
  );
}
