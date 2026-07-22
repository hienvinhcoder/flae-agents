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
    typeof response.success === 'boolean' &&
    Object.hasOwn(response, 'data') &&
    (response.message === undefined || typeof response.message === 'string') &&
    (response.code === undefined || typeof response.code === 'string')
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

  if (!isApiResponse(parsed) || !parsed.success) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned an invalid response.',
      status: response.status,
      retryable: false,
      code: isApiResponse(parsed) ? parsed.code : undefined,
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

      const headers = new Headers(options.headers);
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }

      if (authenticated) {
        const token = forceRefresh ? await tokenProvider(true) : await tokenProvider();
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }

      if (options.workspaceId && !headers.has('X-Workspace-ID')) {
        headers.set('X-Workspace-ID', options.workspaceId);
      }

      let response: Response;
      try {
        response = await fetchImpl(joinUrl(baseUrl, options.path), {
          method: options.method,
          headers,
          body: createRequestBody(options.body, headers),
          signal: options.signal,
        });
      } catch (cause) {
        if (options.signal?.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
          throw abortError(cause);
        }
        if (cause instanceof AppError) {
          throw cause;
        }
        throw new AppError({
          kind: 'network',
          message: 'Unable to reach the server. Check your connection and try again.',
          retryable: true,
          cause,
        });
      }

      if (options.signal?.aborted) {
        throw abortError();
      }

      if (response.status === 401 && authenticated && !forceRefresh) {
        return execute(true);
      }

      if (response.status === 401 && authenticated) {
        await onUnauthorized?.();
        throw httpError(401);
      }

      if (!response.ok) {
        throw httpError(response.status);
      }

      return parseResponse<T>(response);
    }

    return execute(false);
  }

  return { request };
}
