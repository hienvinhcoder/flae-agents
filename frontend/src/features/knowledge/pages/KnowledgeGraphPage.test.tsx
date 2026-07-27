import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viTranslations from "../../../../public/assets/i18n/vi.json";
import { AppProviders } from "../../../app/providers/AppProviders";
import { AppError } from "../../../core/api/errors";
import { apiFailureLifecycle } from "../../../core/api/failure-lifecycle";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { createI18n } from "../../../shared/i18n";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { KnowledgeGraphData } from "../graph/types";
import { KnowledgeGraphPage } from "./KnowledgeGraphPage";

const runtimeApi = vi.hoisted(() => ({ getKnowledgeGraph: vi.fn() }));
const viI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viTranslations } },
  "vi",
);
vi.mock("../api/knowledge-runtime-api", () => runtimeApi);
vi.mock("../../../core/auth/AuthBootstrap", () => ({
  AuthBootstrap: ({ children }: PropsWithChildren) => children,
}));
vi.mock("../graph/ui/GraphCanvas", () => ({
  GraphCanvas: ({ graph, labels, onSelectionChange, workspaceKey }: {
    graph: KnowledgeGraphData;
    labels?: {
      ariaLabel: string;
      instructions: string;
    };
    onSelectionChange: (selection: { id: string; kind: "node" } | null) => void;
    workspaceKey: string;
  }) => (
    <div
      aria-label={labels?.ariaLabel ?? "Interactive knowledge graph"}
      data-testid="graph-canvas"
    >
      <span>{labels?.instructions}</span>
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
    <TestI18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <KnowledgeGraphPage />
        </MemoryRouter>
      </QueryClientProvider>
    </TestI18nProvider>,
  );
  return client;
}

function renderPageWithAppProviders() {
  render(
    <TestI18nProvider>
      <AppProviders>
        <MemoryRouter>
          <KnowledgeGraphPage />
        </MemoryRouter>
      </AppProviders>
    </TestI18nProvider>,
  );
}

function renderPageInVietnamese() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={viI18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <KnowledgeGraphPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("KnowledgeGraphPage", () => {
  beforeEach(() => {
    apiFailureLifecycle.reset();
    runtimeApi.getKnowledgeGraph.mockReset();
    runtimeApi.getKnowledgeGraph.mockResolvedValue(graph);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
  });

  it("renders graph context and controls above the full-height work surface", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /knowledge graph/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("toolbar", { name: /graph tools/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("graph-canvas"),
    ).toBeInTheDocument();
  });

  it("passes localized accessibility labels into the graph canvas", async () => {
    renderPage();

    const canvas = await screen.findByTestId("graph-canvas");
    expect(canvas).toHaveAccessibleName("Knowledge graph");
    expect(canvas).toHaveTextContent(
      "Trace extracted entities, relationships, and evidence across workspace knowledge.",
    );
  });

  it("passes Vietnamese accessibility labels into the graph canvas", async () => {
    renderPageInVietnamese();

    const canvas = await screen.findByTestId("graph-canvas");
    expect(canvas).toHaveAccessibleName("Đồ thị tri thức");
    expect(canvas).toHaveTextContent(
      "Theo dõi các thực thể, mối quan hệ và bằng chứng được trích xuất từ tri thức của không gian làm việc.",
    );
  });

  it("fills the available dashboard viewport while retaining its minimum height", async () => {
    renderPage();

    const workSurface = (await screen.findByTestId("graph-canvas")).parentElement;

    expect(workSurface).toHaveClass("h-[calc(100dvh-18rem)]", "min-h-[32rem]");
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

  it("keeps the graph controls stacking layer above the interactive canvas", async () => {
    renderPage();

    await screen.findByText("1 nodes / 0 edges / ws-1");
    const controlsLayer = screen.getByRole("searchbox", {
      name: /search entities/i,
    }).parentElement?.parentElement?.parentElement;

    expect(controlsLayer).toHaveClass("relative", "z-30");
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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the knowledge graph.",
    );
    expect(screen.queryByText("Graph unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("0 nodes / 0 edges / ws-2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ada" })).not.toBeInTheDocument();
  });

  it("uses localized public copy instead of a raw AppError message", async () => {
    runtimeApi.getKnowledgeGraph.mockRejectedValue(new AppError({
      kind: "validation",
      message: "Raw upstream graph details",
      retryable: false,
      status: 422,
    }));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the knowledge graph.",
    );
    expect(screen.queryByText("Raw upstream graph details")).not.toBeInTheDocument();
  });

  it("uses localized Vietnamese copy for unknown graph failures", async () => {
    runtimeApi.getKnowledgeGraph.mockRejectedValue(
      new Error("Raw graph failure details"),
    );

    renderPageInVietnamese();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tải đồ thị tri thức.",
    );
    expect(screen.queryByText("Raw graph failure details")).not.toBeInTheDocument();
  });

  it("lets the global provider own retryable 5xx announcements", async () => {
    runtimeApi.getKnowledgeGraph.mockRejectedValue(new AppError({
      kind: "server",
      message: "Raw graph outage details",
      retryable: true,
      status: 503,
    }));

    renderPageWithAppProviders();
    act(() => apiFailureLifecycle.reportServerFailure());

    await waitFor(
      () => expect(runtimeApi.getKnowledgeGraph).toHaveBeenCalledTimes(3),
      { timeout: 6_000 },
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Raw graph outage details")).not.toBeInTheDocument();
  }, 7_000);

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
