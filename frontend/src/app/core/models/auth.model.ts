export type LoginProvider = 'email_password' | 'google' | 'facebook';

/**
 * Cấu trúc response chuẩn từ backend theo pattern DataResponse<T>.
 * Tất cả API response đều bọc trong wrapper này.
 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
}

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  login_providers?: LoginProvider[];
}

export interface SyncUserPayload {
  email: string;
  full_name: string;
  avatar_url?: string | null;
  login_provider: LoginProvider;
}