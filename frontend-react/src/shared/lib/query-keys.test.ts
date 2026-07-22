import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('exposes the stable workspaces key', () => {
    expect(queryKeys.workspaces).toEqual(['workspaces']);
    expect(queryKeys.workspaces).toBe(queryKeys.workspaces);
  });

  it('creates stable, workspace-isolated feature keys', () => {
    expect(queryKeys.knowledge('workspace-a')).toEqual(['knowledge', 'workspace-a']);
    expect(queryKeys.topics('workspace-a')).toEqual(['topics', 'workspace-a']);
    expect(queryKeys.agents('workspace-a')).toEqual(['agents', 'workspace-a']);

    expect(queryKeys.knowledge('workspace-a')).toEqual(queryKeys.knowledge('workspace-a'));
    expect(queryKeys.knowledge('workspace-a')).not.toEqual(queryKeys.knowledge('workspace-b'));
  });
});
