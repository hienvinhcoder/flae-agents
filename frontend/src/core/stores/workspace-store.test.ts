import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkspaceStore } from './workspace-store';

describe('workspace store', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.getState().reset();
  });

  it('persists only the current workspace ID using the migration storage key', () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');

    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('workspace-1');
    expect(localStorage.getItem('current_workspace_id')).toBe('workspace-1');
    expect(localStorage).toHaveLength(1);
  });

  it.each(['', 'none', 'null', null])('normalizes %s to no workspace', (value) => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');

    useWorkspaceStore.getState().setCurrentWorkspaceId(value);

    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('current_workspace_id')).toBeNull();
  });

  it('resets workspace state and persisted selection', () => {
    useWorkspaceStore.getState().setCurrentWorkspaceId('workspace-1');

    useWorkspaceStore.getState().reset();

    expect(useWorkspaceStore.getState().currentWorkspaceId).toBeNull();
    expect(localStorage.getItem('current_workspace_id')).toBeNull();
  });
});
