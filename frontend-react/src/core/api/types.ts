export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

export type AppErrorKind = 'auth' | 'validation' | 'network' | 'server' | 'unknown';
