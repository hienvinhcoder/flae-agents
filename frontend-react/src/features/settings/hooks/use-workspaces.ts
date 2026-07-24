import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useEffectEvent, useRef } from 'react';

import type { User } from '../../../core/auth/user-schema';
import { useAuthStore } from '../../../core/stores/auth-store';
import { useWorkspaceStore } from '../../../core/stores/workspace-store';
import { queryKeys } from '../../../shared/lib/query-keys';
import type { Workspace } from '../types/workspace';

interface WorkspaceDependencies {
  fetchWorkspaces: () => Promise<Workspace[]>;
  syncSelection: (workspaceId: string) => Promise<User>;
}

const WORKSPACE_SYNC_FAILURE_LOG = 'Workspace selection synchronization failed.';

export function resolveWorkspaceId(
  savedId: string | null,
  profileId: string | null | undefined,
  workspaces: readonly Workspace[],
) {
  const accessible = new Set(workspaces.map((workspace) => workspace.id));
  if (savedId && accessible.has(savedId)) return savedId;
  if (profileId && accessible.has(profileId)) return profileId;
  return workspaces[0]?.id ?? null;
}

export function useWorkspaces({ fetchWorkspaces, syncSelection }: WorkspaceDependencies) {
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const isSelectionInitialized = useWorkspaceStore((state) => state.isSelectionInitialized);
  const setSelectionInitialized = useWorkspaceStore((state) => state.setSelectionInitialized);
  const setSyncStatus = useWorkspaceStore((state) => state.setSyncStatus);
  const userId = useAuthStore((state) => state.user?.firebase_uid);
  const profileId = useAuthStore((state) => state.user?.current_workspace_id);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const query = useQuery({ queryFn: fetchWorkspaces, queryKey: queryKeys.workspaces });
  const syncWorkspaceSelection = useEffectEvent(syncSelection);
  const initializedKeyRef = useRef<string | null>(null);
  const inFlightSyncRef = useRef<{ key: string; promise: Promise<User> } | null>(null);
  const initializationKey = query.data
    ? `${userId ?? 'anonymous'}:${query.data.map((workspace) => workspace.id).join('|')}`
    : null;

  useEffect(() => {
    if (query.isError) setSelectionInitialized(true);
  }, [query.isError, setSelectionInitialized]);

  useEffect(() => {
    if (!query.data || !initializationKey || initializedKeyRef.current === initializationKey) return;

    const savedId = useWorkspaceStore.getState().currentWorkspaceId;
    const selectedId = resolveWorkspaceId(savedId, profileId, query.data);
    setCurrentWorkspaceId(selectedId);
    setSelectionInitialized(true);
    if (!selectedId || selectedId === profileId) {
      initializedKeyRef.current = initializationKey;
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    let active = true;
    const matchingSync = inFlightSyncRef.current?.key === initializationKey
      ? inFlightSyncRef.current.promise
      : null;
    const syncPromise = matchingSync ?? syncWorkspaceSelection(selectedId);
    if (!matchingSync) inFlightSyncRef.current = { key: initializationKey, promise: syncPromise };

    const completeInitialization = () => {
      initializedKeyRef.current = initializationKey;
      if (inFlightSyncRef.current?.promise === syncPromise) inFlightSyncRef.current = null;
    };

    void syncPromise.then((syncedUser) => {
      if (
        !active ||
        syncedUser.firebase_uid !== userId ||
        useWorkspaceStore.getState().currentWorkspaceId !== selectedId
      ) return;
      completeInitialization();
      setAuthenticated(syncedUser);
      setSyncStatus('success');
    }).catch(() => {
      if (!active) return;
      completeInitialization();
      console.warn(WORKSPACE_SYNC_FAILURE_LOG);
      setSyncStatus('error');
    });
    return () => { active = false; };
  }, [initializationKey, profileId, query.data, setAuthenticated, setCurrentWorkspaceId, setSelectionInitialized, setSyncStatus, userId]);

  return {
    ...query,
    isSelectionInitialized,
  };
}

export function useSelectWorkspace({ syncSelection }: Pick<WorkspaceDependencies, 'syncSelection'>) {
  const queryClient = useQueryClient();
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const setSyncStatus = useWorkspaceStore((state) => state.setSyncStatus);

  return useCallback(async (workspaceId: string | null) => {
    if (!workspaceId?.trim()) return;
    const previousId = useWorkspaceStore.getState().currentWorkspaceId;
    if (previousId === workspaceId) return;

    if (previousId) {
      await queryClient.cancelQueries({
        predicate: (query) => query.queryKey[0] === 'workspaces' && query.queryKey[1] === previousId,
      });
    }
    setCurrentWorkspaceId(workspaceId);
    setSyncStatus('syncing');
    try {
      await syncSelection(workspaceId);
      setSyncStatus('success');
    } catch (error) {
      console.warn(WORKSPACE_SYNC_FAILURE_LOG);
      setSyncStatus('error');
      throw error;
    }
  }, [queryClient, setCurrentWorkspaceId, setSyncStatus, syncSelection]);
}
