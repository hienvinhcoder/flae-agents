import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../../../shared/lib/query-keys";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import {
  useAgentActions,
  useAgentDetail,
  useAgents,
  useCurrentWorkspaceRole,
  useDefaultAgent,
} from "./use-agents";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getAgent: vi.fn(),
  getDefaultAgent: vi.fn(),
  listAgents: vi.fn(),
  updateAgent: vi.fn(),
}));
const workspaceApi = vi.hoisted(() => ({
  listWorkspaceMembers: vi.fn(),
}));

vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../settings/api/workspace-runtime-api", () => workspaceApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherWorkspaceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const agentId = "11111111-1111-4111-8111-111111111111";
const agent = {
  avatar_color: "bg-blue-500",
  avatar_icon: "bot",
  created_at: "2026-07-20T00:00:00Z",
  created_by: "user-1",
  id: agentId,
  is_active: true,
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "Research assistant",
  system_prompt: "Answer from workspace sources.",
  temperature: 0.2,
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

describe("agent queries", () => {
  beforeEach(() => {
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    Object.values(workspaceApi).forEach((mock) => mock.mockReset());
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
  });

  it("does not request agents without a workspace", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useAgents(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(agentsApi.listAgents).not.toHaveBeenCalled();
  });

  it("waits for persisted workspace selection to be validated", async () => {
    agentsApi.listAgents.mockResolvedValue([agent]);
    useWorkspaceStore.getState().setSelectionInitialized(false);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useAgents(workspaceId), {
      wrapper: createWrapper(queryClient),
    });

    expect(agentsApi.listAgents).not.toHaveBeenCalled();
    act(() => useWorkspaceStore.getState().setSelectionInitialized(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.listAgents).toHaveBeenCalledWith(
      workspaceId,
      expect.any(AbortSignal),
    );
  });

  it("keeps agent lists workspace scoped and aborts the previous request", async () => {
    let firstSignal: AbortSignal | undefined;
    agentsApi.listAgents.mockImplementation(
      (requestedWorkspace: string, signal: AbortSignal) => {
        if (requestedWorkspace === workspaceId) {
          firstSignal = signal;
          return new Promise(() => undefined);
        }
        return Promise.resolve([{ ...agent, workspace_id: otherWorkspaceId }]);
      },
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender, result } = renderHook(
      ({ selectedWorkspace }) => useAgents(selectedWorkspace),
      {
        initialProps: { selectedWorkspace: workspaceId },
        wrapper: createWrapper(queryClient),
      },
    );
    await waitFor(() => expect(firstSignal).toBeDefined());

    rerender({ selectedWorkspace: otherWorkspaceId });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstSignal?.aborted).toBe(true);
    expect(queryClient.getQueryData(queryKeys.agentList(workspaceId))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.agentList(otherWorkspaceId))).toEqual([
      { ...agent, workspace_id: otherWorkspaceId },
    ]);
  });

  it("loads agent detail with workspace and agent scoped keys", async () => {
    agentsApi.getAgent.mockResolvedValue(agent);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useAgentDetail(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(queryKeys.agentDetail(workspaceId, agentId))).toEqual(agent);
    expect(agentsApi.getAgent).toHaveBeenCalledWith(
      workspaceId,
      agentId,
      expect.any(AbortSignal),
    );
  });

  it("loads the default agent only after workspace validation", async () => {
    agentsApi.getDefaultAgent.mockResolvedValue({ ...agent, is_default: true });
    useWorkspaceStore.getState().setSelectionInitialized(false);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialProps: { selectedWorkspace: string | null } = {
      selectedWorkspace: workspaceId,
    };
    const { rerender, result } = renderHook(
      ({ selectedWorkspace }: { selectedWorkspace: string | null }) =>
        useDefaultAgent(selectedWorkspace),
      {
        initialProps,
        wrapper: createWrapper(queryClient),
      },
    );

    expect(agentsApi.getDefaultAgent).not.toHaveBeenCalled();
    act(() => useWorkspaceStore.getState().setSelectionInitialized(true));
    rerender({ selectedWorkspace: workspaceId });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentsApi.getDefaultAgent).toHaveBeenCalledWith(
      workspaceId,
      expect.any(AbortSignal),
    );
    expect(queryClient.getQueryData(queryKeys.defaultAgent(workspaceId))).toMatchObject({
      id: agentId,
      is_default: true,
    });
  });

  it("clears default-agent data when the workspace is removed", async () => {
    agentsApi.getDefaultAgent.mockResolvedValue({ ...agent, is_default: true });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const initialProps: { selectedWorkspace: string | null } = {
      selectedWorkspace: workspaceId,
    };
    const { rerender, result } = renderHook(
      ({ selectedWorkspace }: { selectedWorkspace: string | null }) =>
        useDefaultAgent(selectedWorkspace),
      {
        initialProps,
        wrapper: createWrapper(queryClient),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId(null));
    rerender({ selectedWorkspace: null });

    expect(result.current.data).toBeUndefined();
  });

  it("invalidates agent list and detail after create and update", async () => {
    agentsApi.createAgent.mockResolvedValue(agent);
    agentsApi.updateAgent.mockResolvedValue(agent);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useAgentActions(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );
    const payload = {
      avatar_color: agent.avatar_color,
      avatar_icon: agent.avatar_icon,
      name: agent.name,
      system_prompt: agent.system_prompt,
    };

    await act(() => result.current.create.mutateAsync(payload));
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentList(workspaceId),
    });
    invalidate.mockClear();
    await act(() => result.current.update.mutateAsync({ name: "Updated" }));
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentList(workspaceId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentDetail(workspaceId, agentId),
    });
  });

  it("rejects mutations until workspace selection is validated", async () => {
    useWorkspaceStore.getState().setSelectionInitialized(false);
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useAgentActions(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );

    await expect(
      result.current.create.mutateAsync({
        avatar_color: agent.avatar_color,
        avatar_icon: agent.avatar_icon,
        name: agent.name,
        system_prompt: agent.system_prompt,
      }),
    ).rejects.toThrow(/validated workspace/i);
    expect(agentsApi.createAgent).not.toHaveBeenCalled();
  });

  it("invalidates the originating workspace when selection changes mid-mutation", async () => {
    let resolveCreate: ((value: typeof agent) => void) | undefined;
    agentsApi.createAgent.mockImplementation(
      () => new Promise<typeof agent>((resolve) => { resolveCreate = resolve; }),
    );
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { rerender, result } = renderHook(
      ({ selectedWorkspace }) => useAgentActions(selectedWorkspace, agentId),
      {
        initialProps: { selectedWorkspace: workspaceId },
        wrapper: createWrapper(queryClient),
      },
    );
    const payload = {
      avatar_color: agent.avatar_color,
      avatar_icon: agent.avatar_icon,
      name: agent.name,
      system_prompt: agent.system_prompt,
    };
    let mutation: Promise<typeof agent> | undefined;
    act(() => { mutation = result.current.create.mutateAsync(payload); });
    await waitFor(() => expect(resolveCreate).toBeTypeOf("function"));

    act(() => {
      useWorkspaceStore.getState().setCurrentWorkspaceId(otherWorkspaceId);
      rerender({ selectedWorkspace: otherWorkspaceId });
    });
    await act(async () => {
      resolveCreate?.(agent);
      await mutation;
    });

    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentList(workspaceId),
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentList(otherWorkspaceId),
    });
  });

  it("invalidates deletion only when the backend reports success", async () => {
    agentsApi.deleteAgent.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useAgentActions(workspaceId, agentId),
      { wrapper: createWrapper(queryClient) },
    );

    await act(() => result.current.remove.mutateAsync());
    expect(invalidate).not.toHaveBeenCalled();
    await act(() => result.current.remove.mutateAsync());
    expect(invalidate).toHaveBeenCalledWith({
      exact: true,
      queryKey: queryKeys.agentList(workspaceId),
    });
  });

  it("reuses the workspace-members query and selects the current role", async () => {
    workspaceApi.listWorkspaceMembers.mockResolvedValue([
      {
        avatar_url: null,
        email: "owner@example.com",
        full_name: "Owner",
        role: "owner",
        status: "active",
        user_uid: "user-1",
        workspace_id: workspaceId,
      },
    ]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useCurrentWorkspaceRole(workspaceId, "user-1"),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("owner");
    expect(workspaceApi.listWorkspaceMembers).toHaveBeenCalledWith(workspaceId);
    expect(queryClient.getQueryData(queryKeys.workspaceMembers(workspaceId))).toHaveLength(1);
  });
});
