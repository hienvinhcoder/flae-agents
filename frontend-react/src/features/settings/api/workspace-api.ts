import { AppError } from '../../../core/api/errors';
import type { ApiClient } from '../../../core/api/client';
import { userItemResponseSchema, type User } from '../../../core/auth/user-schema';
import { workspaceSchema, type Workspace } from '../types/workspace';

export async function listWorkspaces(client: ApiClient): Promise<Workspace[]> {
  const data = await client.request<unknown>({ auth: true, method: 'GET', path: '/workspaces' });
  const result = workspaceSchema.array().safeParse(data);
  if (!result.success) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned invalid workspace data.',
      retryable: false,
    });
  }
  return result.data;
}

export async function selectWorkspace(workspaceId: string | null, client: ApiClient): Promise<User> {
  if (!workspaceId?.trim()) {
    throw new AppError({
      kind: 'validation',
      message: 'A workspace is required before making this request.',
      retryable: false,
    });
  }
  const data = await client.request<unknown>({
    auth: true,
    body: { workspace_id: workspaceId },
    method: 'PUT',
    path: '/users/current-workspace',
    workspaceId,
  });
  const result = userItemResponseSchema.safeParse(data);
  if (!result.success) {
    throw new AppError({
      kind: 'server',
      message: 'The server returned invalid account data.',
      retryable: false,
    });
  }
  return result.data;
}
