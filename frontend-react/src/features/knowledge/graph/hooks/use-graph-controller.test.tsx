import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { KnowledgeGraphData } from "../types";
import { useGraphController } from "./use-graph-controller";

const runtimeApi = vi.hoisted(() => ({ getKnowledgeGraph: vi.fn() }));
vi.mock("../../api/knowledge-runtime-api", () => runtimeApi);

const graph: KnowledgeGraphData = {
  edges: [
    {
      id: "edge-1",
      label: "OWNS",
      source: "node-1",
      target: "node-2",
      weight: 1,
    },
  ],
  nodes: [
    { degree: 1, frequency: 1, id: "node-1", name: "Ada", type: "person" },
    { degree: 1, frequency: 1, id: "node-2", name: "FLAE", type: "company" },
    { degree: 0, frequency: 1, id: "node-3", name: "Adam", type: "person" },
    { degree: 0, frequency: 1, id: "node-4", name: "Adana", type: "city" },
    { degree: 0, frequency: 1, id: "node-5", name: "Adaline", type: "person" },
    { degree: 0, frequency: 1, id: "node-6", name: "Adapts", type: "concept" },
    { degree: 0, frequency: 1, id: "node-7", name: "Adapter", type: "concept" },
  ],
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useGraphController", () => {
  beforeEach(() => {
    runtimeApi.getKnowledgeGraph.mockReset();
    runtimeApi.getKnowledgeGraph.mockResolvedValue(graph);
  });

  it("GRAPH-02C limits case-insensitive suggestions and focuses a result", async () => {
    const { result } = renderHook(() => useGraphController("ws-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => result.current.setSearch("ADa"));
    expect(result.current.suggestions).toHaveLength(5);
    expect(result.current.suggestions[0]?.name).toBe("Ada");

    act(() => result.current.focusNode("node-3"));
    expect(result.current.selection).toEqual({ kind: "node", id: "node-3" });
    expect(result.current.search).toBe("");
    expect(result.current.command).toMatchObject({ nodeId: "node-3", type: "focus" });
  });

  it("GRAPH-04 clears node and edge selection hidden by a type filter", async () => {
    const { result } = renderHook(() => useGraphController("ws-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => result.current.selectNode("node-2"));
    act(() => result.current.setNodeType("person"));
    expect(result.current.selection).toBeNull();

    act(() => result.current.setNodeType("all"));
    act(() => result.current.selectEdge("edge-1"));
    act(() => result.current.setNodeType("person"));
    expect(result.current.selection).toBeNull();
  });

  it("GRAPH-05 never requests without a workspace and clears immediately", async () => {
    const initialProps: { workspaceId: string | null } = { workspaceId: "ws-1" };
    const { result, rerender } = renderHook(
      ({ workspaceId }: { workspaceId: string | null }) =>
        useGraphController(workspaceId),
      {
        initialProps,
        wrapper: createWrapper(),
      },
    );
    await waitFor(() => expect(result.current.graph.nodes).toHaveLength(7));
    act(() => result.current.selectNode("node-1"));

    rerender({ workspaceId: null });
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    expect(result.current.selection).toBeNull();
    expect(runtimeApi.getKnowledgeGraph).toHaveBeenCalledTimes(1);
  });

  it("GRAPH-05 reloads on workspace changes without retaining old graph state", async () => {
    const nextGraph: KnowledgeGraphData = {
      edges: [],
      nodes: [
        { degree: 0, frequency: 1, id: "next", name: "Next", type: "concept" },
      ],
    };
    runtimeApi.getKnowledgeGraph
      .mockResolvedValueOnce(graph)
      .mockResolvedValueOnce(nextGraph);
    const { result, rerender } = renderHook(
      ({ workspaceId }: { workspaceId: string | null }) =>
        useGraphController(workspaceId),
      { initialProps: { workspaceId: "ws-1" }, wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.graph.nodes).toHaveLength(7));

    rerender({ workspaceId: "ws-2" });
    expect(result.current.graph.nodes).toHaveLength(0);
    await waitFor(() =>
      expect(result.current.graph.nodes.map((node) => node.id)).toEqual(["next"]),
    );
    expect(runtimeApi.getKnowledgeGraph).toHaveBeenNthCalledWith(
      2,
      "ws-2",
      expect.any(AbortSignal),
    );
  });

  it("GRAPH-01 clears graph and selection after a fetch failure", async () => {
    runtimeApi.getKnowledgeGraph.mockRejectedValue(new Error("Graph unavailable"));
    const { result } = renderHook(() => useGraphController("ws-1"), {
      wrapper: createWrapper(),
    });
    act(() => result.current.selectNode("stale"));

    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    expect(result.current.selection).toBeNull();
  });

  it("GRAPH-01 durably clears graph and selection after a same-workspace refetch failure", async () => {
    runtimeApi.getKnowledgeGraph
      .mockResolvedValueOnce(graph)
      .mockRejectedValueOnce(new Error("Refetch failed"))
      .mockResolvedValueOnce(graph);
    const { result } = renderHook(() => useGraphController("ws-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    act(() => result.current.selectNode("node-1"));
    expect(result.current.selection).toEqual({ id: "node-1", kind: "node" });

    await act(async () => {
      await result.current.query.refetch();
    });
    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    expect(result.current.selection).toBeNull();

    await act(async () => {
      await result.current.query.refetch();
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.graph.nodes).toHaveLength(7);
    expect(result.current.selection).toBeNull();
  });

  it("GRAPH-05 aborts A through null and starts a clean request when A returns", async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst: ((value: KnowledgeGraphData) => void) | undefined;
    let resolveFresh: ((value: KnowledgeGraphData) => void) | undefined;
    runtimeApi.getKnowledgeGraph.mockImplementation(
      (_workspaceId: string, signal: AbortSignal) => {
        signals.push(signal);
        return new Promise<KnowledgeGraphData>((resolve) => {
          if (signals.length === 1) resolveFirst = resolve;
          else resolveFresh = resolve;
        });
      },
    );
    const initialProps: { workspaceId: string | null } = { workspaceId: "ws-a" };
    const { result, rerender } = renderHook(
      ({ workspaceId }: { workspaceId: string | null }) =>
        useGraphController(workspaceId),
      { initialProps, wrapper: createWrapper() },
    );
    await waitFor(() => expect(signals).toHaveLength(1));
    act(() => {
      result.current.setSearch("Ada");
      result.current.setNodeType("person");
      result.current.selectNode("node-1");
    });

    rerender({ workspaceId: null });
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    expect(result.current.search).toBe("");
    expect(result.current.nodeType).toBe("all");
    expect(result.current.selection).toBeNull();
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));
    await act(async () => {
      resolveFirst?.(graph);
      await Promise.resolve();
    });
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });

    rerender({ workspaceId: "ws-a" });
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    expect(result.current.search).toBe("");
    expect(result.current.nodeType).toBe("all");
    expect(result.current.selection).toBeNull();
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(result.current.graph).toEqual({ edges: [], nodes: [] });
    act(() => resolveFresh?.(graph));
    await waitFor(() => expect(result.current.graph.nodes).toHaveLength(7));
  });

  it.each([
    ["node", { id: "node-1", kind: "node" } as const, { edges: [], nodes: graph.nodes.slice(1) }],
    ["edge", { id: "edge-1", kind: "edge" } as const, { edges: [], nodes: graph.nodes }],
  ])(
    "GRAPH-04 durably clears a removed selected %s after successful refetches",
    async (_kind, selected, removedGraph) => {
      runtimeApi.getKnowledgeGraph
        .mockResolvedValueOnce(graph)
        .mockResolvedValueOnce(removedGraph)
        .mockResolvedValueOnce(graph);
      const { result } = renderHook(() => useGraphController("ws-1"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      act(() => {
        if (selected.kind === "node") result.current.selectNode(selected.id);
        else result.current.selectEdge(selected.id);
      });
      expect(result.current.selection).toEqual(selected);

      await act(async () => {
        await result.current.query.refetch();
      });
      await waitFor(() => expect(result.current.selection).toBeNull());

      await act(async () => {
        await result.current.query.refetch();
      });
      await waitFor(() => expect(result.current.graph.nodes).toHaveLength(7));
      expect(result.current.selection).toBeNull();
    },
  );
});
