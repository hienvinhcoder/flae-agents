export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
}

export type AppErrorKind = 'auth' | 'validation' | 'network' | 'server' | 'unknown';
