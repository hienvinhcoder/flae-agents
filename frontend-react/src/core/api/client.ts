import { AppError } from './errors';
import type { ApiResponse } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | readonly JsonValue[];
export type RequestBody = Blob | FormData | JsonValue | URLSearchParams;

export interface ApiRequestOptions {
  path: string;
  method: HttpMethod;
  body?: RequestBody;
  workspaceId?: string;
  signal?: AbortSignal;
  auth?: boolean;
  headers?: HeadersInit;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenProvider: (forceRefresh?: boolean) => Promise<string | null>;
  onUnauthorized?: () => Promise<void> | void;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  request<T>(options: ApiRequestOptions): Promise<T>;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function isNativeBody(body: RequestBody): body is Blob | FormData | URLSearchParams {
  return body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams;
}

function createRequestBody(body: RequestBody | undefined, headers: Headers): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    headers.delete('Content-Type');
    return body;
  }

  if (isNativeBody(body)) {
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return JSON.stringify(body);
}

function abortError(cause?: unknown) {
  return new AppError({
    kind: 'network',
    message: 'The request was cancelled.',
    retryable: false,
    cause,
  });
}

function isAbort(cause: unknown, signal?: AbortSignal) {
  return signal?.aborted === true || (cause instanceof DOMException && cause.name === 'AbortError');
}

function lifecycleError(
  cause: unknown,
  phase: 'auth' | 'request' | 'network',
  signal?: AbortSignal,
) {
  if (isAbort(cause, signal)) {
    return abortError(cause);
  }

  if (phase === 'auth') {
    return new AppError({
      kind: 'auth',
      message: 'Unable to authenticate the request. Please sign in again.',
      retryable: false,
      cause,
    });
  }

  if (phase === 'request') {
    return new AppError({
      kind: 'validation',
      message: 'The request could not be prepared. Check your input and try again.',
      retryable: false,
      cause,
    });
  }

  return new AppError({
    kind: 'network',
    message: 'Unable to reach the server. Check your connection and try again.',
    retryable: true,
    cause,
  });
}

async function discardResponseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Disposal is best-effort and must never mask the primary request outcome.
  }
}

function httpError(status: number) {
  if (status === 401) {
    return new AppError({
      kind: 'auth',
      message: 'Your session has expired. Please sign in again.',
      status,
      retryable: false,
    });
  }

  if (status >= 400 && status < 500) {
    return new AppError({
      kind: 'validation',
      message: 'The request could not be completed. Check your input and try again.',
      status,
      retryable: false,
    });
  }

  return new AppError({
    kind: 'server',
    message: 'The server could not complete the request. Please try again.',
    status,
    retryable: status >= 500,
  });
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return (
    typeof response.code === 'string' &&
    typeof response.message === 'string' &&
    Object.hasOwn(response, 'data')
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  let parsed: unknown;

  try {
    parsed = await response.json();
  } catch (cause) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned an invalid response.',
      status: response.status,
      retryable: false,
      cause,
    });
  }

  if (!isApiResponse(parsed)) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned an invalid response.',
      status: response.status,
      retryable: false,
    });
  }

  return parsed.data as T;
}

export function createApiClient({
  baseUrl,
  tokenProvider,
  onUnauthorized,
  fetchImpl = fetch,
}: ApiClientOptions): ApiClient {
  async function request<T>(options: ApiRequestOptions): Promise<T> {
    const authenticated = options.auth !== false;

    async function execute(forceRefresh: boolean): Promise<T> {
      if (options.signal?.aborted) {
        throw abortError();
      }

      let headers: Headers;
      try {
        headers = new Headers(options.headers);
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }
        if (options.workspaceId !== undefined) {
          headers.set('X-Workspace-ID', options.workspaceId);
        }
      } catch (cause) {
        throw lifecycleError(cause, 'request', options.signal);
      }

      if (authenticated) {
        let token: string | null;
        try {
          token = forceRefresh ? await tokenProvider(true) : await tokenProvider();
        } catch (cause) {
          throw lifecycleError(cause, 'auth', options.signal);
        }

        try {
          headers.delete('Authorization');
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        } catch (cause) {
          throw lifecycleError(cause, 'auth', options.signal);
        }
      }

      let body: BodyInit | undefined;
      try {
        body = createRequestBody(options.body, headers);
      } catch (cause) {
        throw lifecycleError(cause, 'request', options.signal);
      }

      let response: Response;
      try {
        response = await fetchImpl(joinUrl(baseUrl, options.path), {
          method: options.method,
          headers,
          body,
          signal: options.signal,
        });
      } catch (cause) {
        throw lifecycleError(cause, 'network', options.signal);
      }

      if (options.signal?.aborted) {
        await discardResponseBody(response);
        throw abortError();
      }

      if (response.status === 401 && authenticated && !forceRefresh) {
        await discardResponseBody(response);
        return execute(true);
      }

      if (response.status === 401 && authenticated) {
        await discardResponseBody(response);
        try {
          await onUnauthorized?.();
        } catch {
          // Cleanup failures must not replace the terminal safe authentication error.
        }
        throw httpError(401);
      }

      if (!response.ok) {
        await discardResponseBody(response);
        throw httpError(response.status);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return parseResponse<T>(response);
    }

    return execute(false);
  }

  return { request };
}
