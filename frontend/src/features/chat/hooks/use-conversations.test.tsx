import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../../../shared/lib/query-keys";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import {
  useConversationActions,
  useConversationMessages,
  useConversationSessions,
} from "./use-conversations";

const runtimeApi = vi.hoisted(() => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listMessages: vi.fn(),
  listSessions: vi.fn(),
}));

vi.mock("../api/chat-sessions-runtime-api", () => runtimeApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherWorkspaceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const session = {
  agent_id: agentId,
  created_at: "2026-07-23T00:00:00Z",
  created_by: "user-1",
  id: sessionId,
  title: "Launch questions",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("conversation queries", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
  });

  it("gates sessions until workspace and agent IDs are available", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useConversationSessions(null, agentId), {
      wrapper: createWrapper(queryClient),
    });
    renderHook(() => useConversationSessions(workspaceId, null), {
      wrapper: createWrapper(queryClient),
    });

    expect(runtimeApi.listSessions).not.toHaveBeenCalled();
  });

  it("loads sessions with a workspace and agent scoped key", async () => {
    runtimeApi.listSessions.mockResolvedValue([session]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useConversationSessions(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(runtimeApi.listSessions).toHaveBeenCalledWith(
      workspaceId,
      agentId,
      expect.any(AbortSignal),
    );
    expect(
      queryClient.getQueryData(queryKeys.chatSessions(workspaceId, agentId)),
    ).toEqual([session]);
  });

  it("invalidates sessions after create and successful delete only", async () => {
    runtimeApi.createSession.mockResolvedValue(session);
    runtimeApi.deleteSession.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useConversationActions(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );
    queryClient.setQueryData(
      queryKeys.chatSessions(workspaceId, agentId),
      [],
    );

    await act(() => result.current.create.mutateAsync({ title: "Launch questions" }));
    expect(
      queryClient.getQueryData(queryKeys.chatSessions(workspaceId, agentId)),
    ).toEqual([session]);
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.chatSessions(workspaceId, agentId),
    });
    invalidate.mockClear();
    await act(() => result.current.remove.mutateAsync(sessionId));
    expect(invalidate).not.toHaveBeenCalled();
    await act(() => result.current.remove.mutateAsync(sessionId));
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.chatSessions(workspaceId, agentId),
    });
    expect(
      queryClient.getQueryData(queryKeys.chatSessions(workspaceId, agentId)),
    ).toEqual([]);
  });

  it("loads message history without requesting incomplete IDs", async () => {
    const messages = [
      {
        citations: [],
        content: "What is the launch date?",
        created_at: "2026-07-24T00:00:00Z",
        created_by: "user-1",
        id: "33333333-3333-4333-8333-333333333333",
        role: "user",
        session_id: sessionId,
      },
    ];
    runtimeApi.listMessages.mockResolvedValue(messages);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useConversationMessages(workspaceId, agentId, sessionId),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(runtimeApi.listMessages).toHaveBeenCalledWith(
      workspaceId,
      agentId,
      sessionId,
      expect.any(AbortSignal),
    );
    expect(
      queryClient.getQueryData(
        queryKeys.chatMessages(workspaceId, agentId, sessionId),
      ),
    ).toEqual(messages);
  });

  it("invalidates the originating session list after a workspace switch", async () => {
    let resolveCreate: ((value: typeof session) => void) | undefined;
    runtimeApi.createSession.mockImplementation(
      () => new Promise<typeof session>((resolve) => { resolveCreate = resolve; }),
    );
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { rerender, result } = renderHook(
      ({ selectedWorkspace }) => useConversationActions(selectedWorkspace, agentId),
      {
        initialProps: { selectedWorkspace: workspaceId },
        wrapper: createWrapper(queryClient),
      },
    );
    let mutation: Promise<typeof session> | undefined;
    act(() => { mutation = result.current.create.mutateAsync({}); });
    await waitFor(() => expect(resolveCreate).toBeTypeOf("function"));

    act(() => {
      useWorkspaceStore.getState().setCurrentWorkspaceId(otherWorkspaceId);
      rerender({ selectedWorkspace: otherWorkspaceId });
    });
    await act(async () => {
      resolveCreate?.(session);
      await mutation;
    });

    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.chatSessions(workspaceId, agentId),
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.chatSessions(otherWorkspaceId, agentId),
    });
  });
});
