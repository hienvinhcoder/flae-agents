export enum PlatformType {
  MANUAL = 'manual'
}

export interface Workspace {
  id: string; // tenant_id
  name: string;
  industry?: string;
  platform: PlatformType;
  owner_uid: string;
  admins?: Record<string, boolean>;
  members?: Record<string, boolean>;
}

export interface CreateManualWorkspacePayload {
  name: string;
  industry?: string;
  description?: string;
  website?: string;
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
