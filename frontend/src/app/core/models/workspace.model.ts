export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspaceMemberStatus = 'active' | 'suspended';
export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'expired';

export interface Workspace {
  id: string; // tenant_id
  name: string;
  owner_uid: string;
  admins?: Record<string, boolean>;
  members?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_uid: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  invited_by_name: string;
  status: WorkspaceInvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface CreateManualWorkspacePayload {
  name: string;
}

export interface GetOauthUrlPayload {
  platform: string;
  redirect_uri?: string;
}

export interface GetOauthUrlResponse {
  oauth_url: string;
}

export interface HandleOauthCallbackPayload {
  code: string;
  state?: string;
  platform?: string;
}
