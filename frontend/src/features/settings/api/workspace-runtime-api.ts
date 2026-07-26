import { createApiClient } from "../../../core/api/client";
import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import * as workspaceApi from "./workspace-api";
import type {
  WorkspaceInvitationPayload,
  WorkspaceMemberUpdatePayload,
  WorkspaceNamePayload,
  WorkspaceOauthCallbackPayload,
  WorkspaceOauthUrlPayload,
} from "../types/workspace";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: getAuthToken,
});

export const fetchWorkspaces = () => workspaceApi.listWorkspaces(client);
export const syncWorkspaceSelection = (workspaceId: string) =>
  workspaceApi.selectWorkspace(workspaceId, client);
export const createManualWorkspace = (payload: WorkspaceNamePayload) =>
  workspaceApi.createManualWorkspace(payload, client);
export const updateWorkspace = (
  workspaceId: string,
  payload: WorkspaceNamePayload,
) => workspaceApi.updateWorkspace(workspaceId, payload, client);
export const listWorkspaceMembers = (workspaceId: string) =>
  workspaceApi.listWorkspaceMembers(workspaceId, client);
export const listPendingInvitations = (workspaceId: string) =>
  workspaceApi.listPendingInvitations(workspaceId, client);
export const inviteWorkspaceMember = (
  workspaceId: string,
  payload: WorkspaceInvitationPayload,
) => workspaceApi.inviteWorkspaceMember(workspaceId, payload, client);
export const acceptWorkspaceInvitation = (payload: { token: string }) =>
  workspaceApi.acceptWorkspaceInvitation(payload, client);
export const updateWorkspaceMember = (
  workspaceId: string,
  userUid: string,
  payload: WorkspaceMemberUpdatePayload,
) => workspaceApi.updateWorkspaceMember(workspaceId, userUid, payload, client);
export const removeWorkspaceMember = (workspaceId: string, userUid: string) =>
  workspaceApi.removeWorkspaceMember(workspaceId, userUid, client);
export const getWorkspaceOauthUrl = (payload: WorkspaceOauthUrlPayload) =>
  workspaceApi.getWorkspaceOauthUrl(payload, client);
export const handleWorkspaceOauthCallback = (
  payload: WorkspaceOauthCallbackPayload,
) => workspaceApi.handleWorkspaceOauthCallback(payload, client);
