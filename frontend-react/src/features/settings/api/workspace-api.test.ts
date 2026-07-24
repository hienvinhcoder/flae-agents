import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../../../core/api/client';
import { listWorkspaces, selectWorkspace } from './workspace-api';

const backendUserItem = {
  code: '',
  message: '',
  id: 'user-1',
  firebase_uid: 'firebase-1',
  email: 'owner@example.com',
  full_name: 'Owner',
  is_active: true,
  login_providers: ['google'],
  avatar_url: null,
  current_workspace_id: 'ws-2',
};

describe('workspace API', () => {
  it('uses the actual backend workspace response schema', async () => {
    const request = vi.fn().mockResolvedValue([
      { id: 'ws-1', name: 'Platform', owner_uid: 'firebase-1', created_at: '2026-01-01T00:00:00Z' },
    ]);

    await expect(listWorkspaces({ request } as ApiClient)).resolves.toEqual([
      { id: 'ws-1', name: 'Platform', owner_uid: 'firebase-1', created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(request).toHaveBeenCalledWith({ auth: true, method: 'GET', path: '/workspaces' });
  });

  it('never issues a malformed request without a workspace ID', async () => {
    const request = vi.fn();

    await expect(selectWorkspace(null, { request } as ApiClient)).rejects.toThrow('workspace');
    expect(request).not.toHaveBeenCalled();
  });

  it('sends the managed workspace header option and validates the full FastAPI user fixture', async () => {
    const request = vi.fn().mockResolvedValue(backendUserItem);

    await expect(selectWorkspace('ws-2', { request } as ApiClient)).resolves.toMatchObject({
      id: 'user-1', current_workspace_id: 'ws-2', firebase_uid: 'firebase-1',
    });
    expect(request).toHaveBeenCalledWith({
      auth: true,
      body: { workspace_id: 'ws-2' },
      method: 'PUT',
      path: '/users/current-workspace',
      workspaceId: 'ws-2',
    });
  });

  it('rejects incomplete nested UserItemResponse data', async () => {
    const invalid = {
      code: '', message: '', id: 'user-1', email: 'owner@example.com', full_name: 'Owner',
      is_active: true, login_providers: ['google'], avatar_url: null, current_workspace_id: 'ws-2',
    };
    const request = vi.fn().mockResolvedValue(invalid);
    const error: unknown = await selectWorkspace('ws-2', { request } as ApiClient).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ kind: 'server', message: 'The server returned invalid account data.' });
    if (typeof error !== 'object' || error === null) throw new Error('Expected an AppError');
    expect(Object.hasOwn(error, 'cause')).toBe(false);
  });

  it('does not retain malformed workspace payloads in the safe validation error', async () => {
    const request = vi.fn().mockResolvedValue([{ id: '', name: 'Private Workspace', owner_uid: 'owner@example.com' }]);
    const error: unknown = await listWorkspaces({ request } as ApiClient).catch((cause: unknown) => cause);

    expect(error).toMatchObject({ kind: 'server', message: 'The server returned invalid workspace data.' });
    if (!(error instanceof Error)) throw new Error('Expected an AppError');
    expect(Object.hasOwn(error, 'cause')).toBe(false);
    expect(error.message).not.toContain('Private Workspace');
    expect(error.message).not.toContain('owner@example.com');
  });
});
