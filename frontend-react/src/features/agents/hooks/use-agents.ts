import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import * as workspaceRuntimeApi from "../../settings/api/workspace-runtime-api";
import * as runtimeApi from "../api/agents-runtime-api";
import type {
  AgentCreatePayload,
  AgentUpdatePayload,
} from "../types/agent";

function hasId(value: string | null) {
  return Boolean(value?.trim());
}

function requireId(value: string | null, resource: string) {
  if (!value?.trim()) {
    throw new AppError({
      kind: "validation",
      message: `${resource} is required before making this request.`,
      retryable: false,
    });
  }
  return value;
}

function requireValidatedWorkspaceId(workspaceId: string | null) {
  if (!useWorkspaceStore.getState().isSelectionInitialized) {
    throw new AppError({
      kind: "validation",
      message: "A validated workspace is required before making this request.",
      retryable: false,
    });
  }
  return requireId(workspaceId, "A workspace");
}

export function useAgents(workspaceId: string | null) {
  const isSelectionInitialized = useWorkspaceStore(
    (state) => state.isSelectionInitialized,
  );
  return useQuery({
    enabled: isSelectionInitialized && hasId(workspaceId),
    queryFn: ({ signal }) =>
      runtimeApi.listAgents(workspaceId as string, signal),
    queryKey: queryKeys.agentList(workspaceId ?? "none"),
  });
}

export function useAgentDetail(
  workspaceId: string | null,
  agentId: string | null,
) {
  const isSelectionInitialized = useWorkspaceStore(
    (state) => state.isSelectionInitialized,
  );
  return useQuery({
    enabled: isSelectionInitialized && hasId(workspaceId) && hasId(agentId),
    queryFn: ({ signal }) =>
      runtimeApi.getAgent(
        workspaceId as string,
        agentId as string,
        signal,
      ),
    queryKey: queryKeys.agentDetail(
      workspaceId ?? "none",
      agentId ?? "none",
    ),
  });
}

export function useCurrentWorkspaceRole(
  workspaceId: string | null,
  userUid: string | null,
) {
  const isSelectionInitialized = useWorkspaceStore(
    (state) => state.isSelectionInitialized,
  );
  return useQuery({
    enabled: isSelectionInitialized && hasId(workspaceId) && hasId(userUid),
    queryFn: () =>
      workspaceRuntimeApi.listWorkspaceMembers(workspaceId as string),
    queryKey: queryKeys.workspaceMembers(workspaceId ?? "none"),
    select: (members) =>
      members.find((member) => member.user_uid === userUid)?.role ?? "member",
  });
}

export function useAgentActions(
  workspaceId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();
  const invalidateList = (workspace: string) =>
    queryClient.invalidateQueries({
      exact: true,
      queryKey: queryKeys.agentList(workspace),
    });
  const createMutation = useMutation({
    mutationFn: ({
      payload,
      workspace,
    }: {
      payload: AgentCreatePayload;
      workspace: string;
    }) => runtimeApi.createAgent(workspace, payload),
    onSuccess: (_created, variables) => invalidateList(variables.workspace),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      resourceId,
      workspace,
    }: {
      payload: AgentUpdatePayload;
      resourceId: string;
      workspace: string;
    }) => runtimeApi.updateAgent(workspace, resourceId, payload),
    onSuccess: async (_updated, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: queryKeys.agentList(variables.workspace),
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: queryKeys.agentDetail(
            variables.workspace,
            variables.resourceId,
          ),
        }),
      ]);
    },
  });
  const removeMutation = useMutation({
    mutationFn: ({
      resourceId,
      workspace,
    }: {
      resourceId: string;
      workspace: string;
    }) => runtimeApi.deleteAgent(workspace, resourceId),
    onSuccess: (deleted, variables) =>
      deleted ? invalidateList(variables.workspace) : undefined,
  });

  const snapshot = () => ({
    resourceId: requireId(agentId, "An agent"),
    workspace: requireValidatedWorkspaceId(workspaceId),
  });

  return {
    create: {
      ...createMutation,
      mutate: (payload: AgentCreatePayload) =>
        createMutation.mutate({
          payload,
          workspace: requireValidatedWorkspaceId(workspaceId),
        }),
      mutateAsync: async (payload: AgentCreatePayload) =>
        createMutation.mutateAsync({
          payload,
          workspace: requireValidatedWorkspaceId(workspaceId),
        }),
    },
    remove: {
      ...removeMutation,
      mutate: () => removeMutation.mutate(snapshot()),
      mutateAsync: async () => removeMutation.mutateAsync(snapshot()),
    },
    update: {
      ...updateMutation,
      mutate: (payload: AgentUpdatePayload) =>
        updateMutation.mutate({ ...snapshot(), payload }),
      mutateAsync: async (payload: AgentUpdatePayload) =>
        updateMutation.mutateAsync({ ...snapshot(), payload }),
    },
  };
}
