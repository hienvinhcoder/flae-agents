import { z } from "zod";

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  owner_uid: z.string(),
  created_at: z.string().nullable().optional().default(null),
});

export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaceRoleSchema = z.enum([
  "owner",
  "admin",
  "member",
  "viewer",
]);
export const workspaceMemberStatusSchema = z.enum(["active", "suspended"]);
export const workspaceInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
]);

export const workspaceMemberSchema = z.object({
  workspace_id: z.string().min(1),
  user_uid: z.string().min(1),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: workspaceRoleSchema,
  status: workspaceMemberStatusSchema,
});

export const workspaceInvitationSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: workspaceRoleSchema,
  token: z.string().min(1),
  invited_by: z.string().min(1),
  status: workspaceInvitationStatusSchema,
  expires_at: z.string().min(1),
  created_at: z.string().min(1),
});

export const workspaceOauthUrlSchema = z.object({
  oauth_url: z.string().url(),
});

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type WorkspaceMemberStatus = z.infer<typeof workspaceMemberStatusSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
export type WorkspaceOauthUrl = z.infer<typeof workspaceOauthUrlSchema>;

export interface WorkspaceNamePayload {
  name: string;
}
export interface WorkspaceInvitationPayload {
  email: string;
  role: WorkspaceRole;
}
export interface WorkspaceMemberUpdatePayload {
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
}
export interface WorkspaceOauthUrlPayload {
  platform: string;
  redirect_uri?: string;
}
export interface WorkspaceOauthCallbackPayload {
  code: string;
  state?: string;
  platform?: string;
}
