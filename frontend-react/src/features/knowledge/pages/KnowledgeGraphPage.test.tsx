import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import type { KnowledgeGraphData } from "../graph/types";
import { KnowledgeGraphPage } from "./KnowledgeGraphPage";

const runtimeApi = vi.hoisted(() => ({ getKnowledgeGraph: vi.fn() }));
vi.mock("../api/knowledge-runtime-api", () => runtimeApi);
vi.mock("../graph/ui/GraphCanvas", () => ({
  GraphCanvas: ({ graph, onSelectionChange, workspaceKey }: {
    graph: KnowledgeGraphData;
    onSelectionChange: (selection: { id: string; kind: "node" } | null) => void;
    workspaceKey: string;
  }) => (
    <div aria-label="Interactive knowledge graph">
      <span>{graph.nodes.length} nodes / {graph.edges.length} edges / {workspaceKey}</span>
      <span>{graph.nodes.map((node) => node.name).join(", ")}</span>
      {graph.nodes[0] ? (
        <button onClick={() => onSelectionChange({ id: graph.nodes[0]!.id, kind: "node" })}>
          Select first node
        </button>
      ) : null}
      <button onClick={() => onSelectionChange(null)}>Clear canvas selection</button>
    </div>
  ),
}));

const graph: KnowledgeGraphData = {
  edges: [],
  nodes: [
    {
      degree: 0,
      description: "Founder",
      frequency: 2,
      id: "node-1",
      name: "Ada",
      type: "person",
    },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <KnowledgeGraphPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe("KnowledgeGraphPage", () => {
  beforeEach(() => {
    runtimeApi.getKnowledgeGraph.mockReset();
    runtimeApi.getKnowledgeGraph.mockResolvedValue(graph);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
  });

  it("GRAPH-01 shows a full-canvas loader and initializes the graph", async () => {
    let resolveGraph: ((value: KnowledgeGraphData) => void) | undefined;
    runtimeApi.getKnowledgeGraph.mockImplementation(
      () => new Promise((resolve) => { resolveGraph = resolve; }),
    );
    renderPage();

    expect(screen.getByRole("status", { name: /loading knowledge graph/i })).toBeInTheDocument();
    act(() => resolveGraph?.(graph));
    expect(await screen.findByText("1 nodes / 0 edges / ws-1")).toBeInTheDocument();
  });

  it("GRAPH-01 renders an empty prompt linking back to knowledge documents", async () => {
    runtimeApi.getKnowledgeGraph.mockResolvedValue({ edges: [], nodes: [] });
    renderPage();

    expect(await screen.findByRole("heading", { name: /no graph data yet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open knowledge base/i })).toHaveAttribute(
      "href",
      "/dashboard/knowledge",
    );
  });

  it("GRAPH-01 clears the graph and selection and displays an error toast", async () => {
    const user = userEvent.setup();
    runtimeApi.getKnowledgeGraph.mockResolvedValueOnce(graph);
    renderPage();
    await screen.findByText("1 nodes / 0 edges / ws-1");
    await user.click(screen.getByRole("button", { name: /select first node/i }));
    expect(screen.getByRole("heading", { name: "Ada" })).toBeInTheDocument();

    runtimeApi.getKnowledgeGraph.mockRejectedValueOnce(new Error("Graph unavailable"));
    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Graph unavailable");
    expect(screen.getByText("0 nodes / 0 edges / ws-2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ada" })).not.toBeInTheDocument();
  });

  it("GRAPH-05 reloads for workspace changes and immediately clears a removed workspace", async () => {
    runtimeApi.getKnowledgeGraph
      .mockResolvedValueOnce(graph)
      .mockResolvedValueOnce({ edges: [], nodes: [{ ...graph.nodes[0], id: "node-2", name: "Lin" }] });
    renderPage();
    await screen.findByText("1 nodes / 0 edges / ws-1");

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2"));
    await waitFor(() =>
      expect(runtimeApi.getKnowledgeGraph).toHaveBeenCalledWith(
        "ws-2",
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText("Lin")).toBeInTheDocument();

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId(null));
    expect(screen.getByText("0 nodes / 0 edges / none")).toBeInTheDocument();
    expect(screen.getByText(/select a workspace to explore its graph/i)).toBeInTheDocument();
    expect(runtimeApi.getKnowledgeGraph).toHaveBeenCalledTimes(2);
  });
});
