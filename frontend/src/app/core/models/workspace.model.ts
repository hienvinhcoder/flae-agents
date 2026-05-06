export enum PlatformType {
  MANUAL = 'manual',
  HARAVAN = 'haravan',
  KIOTVIET = 'kiotviet'
}

export interface Workspace {
  id: string; // tenant_id
  name: string;
  industry?: string;
  platform: PlatformType;
  owner_uid: string;
}

export interface CreateManualWorkspacePayload {
  name: string;
  industry?: string;
  description?: string;
  website?: string;
}

export interface GetOauthUrlPayload {
  platform: PlatformType;
  shop_domain?: string; // Required for Haravan
}

export interface GetOauthUrlResponse {
  auth_url: string;
}

export interface HandleOauthCallbackPayload {
  platform: PlatformType;
  code: string;
  shop_domain?: string;
}
