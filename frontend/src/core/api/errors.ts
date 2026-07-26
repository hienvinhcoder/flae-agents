import type { AppErrorKind } from './types';

export interface AppErrorOptions {
  kind: AppErrorKind;
  message: string;
  status?: number;
  retryable: boolean;
  code?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;
  readonly retryable: boolean;
  readonly code?: string;

  constructor(options: AppErrorOptions) {
    const errorOptions =
      options.cause instanceof Error ? { cause: new Error('An underlying error occurred.') } : undefined;
    super(options.message, errorOptions);
    this.name = 'AppError';
    this.kind = options.kind;
    this.status = options.status;
    this.retryable = options.retryable;
    this.code = options.code;
  }
}
