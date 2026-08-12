import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import * as runtimeApi from "../api/chat-sessions-runtime-api";
import type { ChatSession, ChatSessionCreatePayload } from "../types/chat";

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

export function useConversationSessions(
  workspaceId: string | null,
  agentId: string | null,
) {
  const isSelectionInitialized = useWorkspaceStore(
    (state) => state.isSelectionInitialized,
  );
  return useQuery({
    enabled: isSelectionInitialized && hasId(workspaceId) && hasId(agentId),
    queryFn: ({ signal }) =>
      runtimeApi.listSessions(
        workspaceId as string,
        agentId as string,
        signal,
      ),
    queryKey: queryKeys.chatSessions(
      workspaceId ?? "none",
      agentId ?? "none",
    ),
  });
}

export function useConversationMessages(
  workspaceId: string | null,
  agentId: string | null,
  sessionId: string | null,
) {
  const isSelectionInitialized = useWorkspaceStore(
    (state) => state.isSelectionInitialized,
  );
  return useQuery({
    enabled:
      isSelectionInitialized &&
      hasId(workspaceId) &&
      hasId(agentId) &&
      hasId(sessionId),
    queryFn: ({ signal }) =>
      runtimeApi.listMessages(
        workspaceId as string,
        agentId as string,
        sessionId as string,
        signal,
      ),
    queryKey: queryKeys.chatMessages(
      workspaceId ?? "none",
      agentId ?? "none",
      sessionId ?? "none",
    ),
  });
}

export function useConversationActions(
  workspaceId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();
  const invalidateSessions = (workspace: string, resourceId: string) =>
    queryClient.invalidateQueries({
      exact: true,
      queryKey: queryKeys.chatSessions(
        workspace,
        resourceId,
      ),
    });
  const createMutation = useMutation({
    mutationFn: ({
      payload,
      resourceId,
      workspace,
    }: {
      payload: ChatSessionCreatePayload;
      resourceId: string;
      workspace: string;
    }) => runtimeApi.createSession(workspace, resourceId, payload),
    onSuccess: (created, variables) => {
      const queryKey = queryKeys.chatSessions(
        variables.workspace,
        variables.resourceId,
      );
      queryClient.setQueryData<ChatSession[]>(queryKey, (current = []) => [
        created,
        ...current.filter((session) => session.id !== created.id),
      ]);
      return invalidateSessions(variables.workspace, variables.resourceId);
    },
  });
  const removeMutation = useMutation({
    mutationFn: ({
      resourceId,
      sessionId,
      workspace,
    }: {
      resourceId: string;
      sessionId: string;
      workspace: string;
    }) => runtimeApi.deleteSession(workspace, resourceId, sessionId),
    onSuccess: (deleted, variables) => {
      if (!deleted) return undefined;
      queryClient.setQueryData<ChatSession[]>(
        queryKeys.chatSessions(variables.workspace, variables.resourceId),
        (current = []) =>
          current.filter((session) => session.id !== variables.sessionId),
      );
      return invalidateSessions(variables.workspace, variables.resourceId);
    },
  });

  const snapshot = () => ({
    resourceId: requireId(agentId, "An agent"),
    workspace: requireValidatedWorkspaceId(workspaceId),
  });

  return {
    create: {
      ...createMutation,
      mutate: (payload: ChatSessionCreatePayload = {}) =>
        createMutation.mutate({ ...snapshot(), payload }),
      mutateAsync: async (payload: ChatSessionCreatePayload = {}) =>
        createMutation.mutateAsync({ ...snapshot(), payload }),
    },
    remove: {
      ...removeMutation,
      mutate: (sessionId: string) =>
        removeMutation.mutate({
          ...snapshot(),
          sessionId: requireId(sessionId, "A chat session"),
        }),
      mutateAsync: async (sessionId: string) =>
        removeMutation.mutateAsync({
          ...snapshot(),
          sessionId: requireId(sessionId, "A chat session"),
        }),
    },
  };
}
