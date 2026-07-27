import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
} from "../types/knowledge";
import { KnowledgeListPage } from "./KnowledgeListPage";

const runtimeApi = vi.hoisted(() => ({
  createManualDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  retryIngestion: vi.fn(),
  uploadDocument: vi.fn(),
}));

vi.mock("../api/knowledge-runtime-api", () => runtimeApi);

const roadmap: KnowledgeDocument = {
  chunk_count: 12,
  created_at: "2026-07-24T00:00:00Z",
  description: "Product direction",
  document_type: "pdf",
  entity_count: 8,
  file_name: "roadmap.pdf",
  file_size: 2_048,
  id: "11111111-1111-4111-8111-111111111111",
  relation_count: 5,
  status: "completed",
  title: "Product roadmap",
  updated_at: "2026-07-24T00:05:00Z",
  uploaded_by: "owner@example.com",
};

const incident: KnowledgeDocument = {
  ...roadmap,
  chunk_count: null,
  description: "Incident response notes",
  document_type: "manual_input",
  entity_count: null,
  file_name: null,
  file_size: null,
  id: "22222222-2222-4222-8222-222222222222",
  relation_count: null,
  status: "failed",
  title: "Incident handbook",
};

const roadmapDetail: KnowledgeDocumentDetail = {
  ...roadmap,
  content_text: "Roadmap content",
  error_message: null,
  gcs_path: "gs://knowledge/roadmap.pdf",
  mime_type: "application/pdf",
  processing_time_seconds: 4.2,
  temporal_workflow_id: "workflow-1",
  token_usage: { input: 500, output: 120 },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <KnowledgeListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </TestI18nProvider>,
  );
  return queryClient;
}

describe("KnowledgeListPage", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.listDocuments.mockResolvedValue([roadmap, incident]);
    runtimeApi.getDocument.mockResolvedValue(roadmapDetail);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
  });

  it("renders the document list and supports search and status filtering", async () => {
    const user = userEvent.setup();
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );

    expect(table.getByText("Product roadmap")).toBeInTheDocument();
    expect(table.getByText("Incident handbook")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: /search documents/i }), "roadmap");
    expect(table.getByText("Product roadmap")).toBeInTheDocument();
    expect(table.queryByText("Incident handbook")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: /search documents/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /status/i }),
      "failed",
    );
    expect(table.queryByText("Product roadmap")).not.toBeInTheDocument();
    expect(table.getByText("Incident handbook")).toBeInTheDocument();
  });

  it("groups knowledge actions in the page header and keeps the table caption", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Knowledge base" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload document/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add content/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    ).toBeInTheDocument();
  });

  it("loads a selected document detail and exposes processing metrics", async () => {
    const user = userEvent.setup();
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );

    await user.click(
      table.getByRole("button", { name: /open product roadmap/i }),
    );

    expect(runtimeApi.getDocument).toHaveBeenCalledWith("ws-1", roadmap.id);
    const detail = within(
      await screen.findByRole("dialog", { name: "Product roadmap" }),
    );
    expect(
      detail.getByRole("heading", { name: "Product roadmap" }),
    ).toBeInTheDocument();
    expect(detail.getByText(/12 chunks/i)).toBeInTheDocument();
    expect(detail.getByText(/4.2 seconds/i)).toBeInTheDocument();
  });

  it("validates upload metadata and submits a supported file", async () => {
    const user = userEvent.setup();
    runtimeApi.uploadDocument.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      status: "pending",
      temporal_workflow_id: "workflow-3",
      title: "Architecture",
    });
    renderPage();
    await screen.findByRole("table", { name: /knowledge documents/i });

    await user.click(screen.getByRole("button", { name: /upload document/i }));
    await user.click(screen.getByRole("button", { name: /^upload$/i }));
    expect(await screen.findByText(/select a document/i)).toBeInTheDocument();
    expect(runtimeApi.uploadDocument).not.toHaveBeenCalled();

    const file = new File(["# Architecture"], "architecture.md", {
      type: "text/markdown",
    });
    await user.upload(screen.getByLabelText(/document file/i), file);
    await user.type(screen.getByLabelText(/document title/i), "Architecture");
    await user.type(screen.getByLabelText(/description/i), "System guide");
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    await waitFor(() =>
      expect(runtimeApi.uploadDocument).toHaveBeenCalledWith("ws-1", {
        description: "System guide",
        file,
        title: "Architecture",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /upload document/i })).not.toBeInTheDocument(),
    );
  });

  it("validates and submits manually entered content", async () => {
    const user = userEvent.setup();
    runtimeApi.createManualDocument.mockResolvedValue({
      id: "44444444-4444-4444-8444-444444444444",
      status: "pending",
      temporal_workflow_id: "workflow-4",
      title: "Team principles",
    });
    renderPage();
    await screen.findByRole("table", { name: /knowledge documents/i });

    await user.click(screen.getByRole("button", { name: /add content/i }));
    await user.click(screen.getByRole("button", { name: /save content/i }));
    expect(await screen.findByText(/enter a document title/i)).toBeInTheDocument();
    expect(screen.getByText(/enter document content/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/document title/i), "Team principles");
    await user.type(screen.getByLabelText(/^content$/i), "Prefer durable decisions.");
    await user.click(screen.getByRole("button", { name: /save content/i }));

    await waitFor(() =>
      expect(runtimeApi.createManualDocument).toHaveBeenCalledWith("ws-1", {
        content_text: "Prefer durable decisions.",
        description: undefined,
        title: "Team principles",
      }),
    );
  });

  it("retries failed ingestion and confirms deletion before closing detail", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    runtimeApi.retryIngestion.mockResolvedValue({
      id: incident.id,
      status: "pending",
      temporal_workflow_id: "workflow-retry",
      title: incident.title,
    });
    runtimeApi.deleteDocument
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    runtimeApi.getDocument.mockResolvedValue({
      ...roadmapDetail,
      ...incident,
      content_text: "Incident content",
      error_message: "Parser failed",
    });
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );

    await user.click(
      table.getByRole("button", { name: /retry incident handbook/i }),
    );
    await waitFor(() =>
      expect(runtimeApi.retryIngestion).toHaveBeenCalledWith("ws-1", incident.id),
    );

    await user.click(
      table.getByRole("button", { name: /open incident handbook/i }),
    );
    expect(
      await screen.findByRole("heading", { name: "Incident handbook" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete document/i }));
    await waitFor(() => expect(runtimeApi.deleteDocument).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { name: "Incident handbook" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /delete document/i }));
    await waitFor(() =>
      expect(runtimeApi.deleteDocument).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Incident handbook" })).not.toBeInTheDocument(),
    );
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("disables a failed document retry while its request is pending", async () => {
    const user = userEvent.setup();
    let resolveRetry: ((value: unknown) => void) | undefined;
    runtimeApi.retryIngestion.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
    );
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );

    await user.click(
      table.getByRole("button", { name: /retry incident handbook/i }),
    );
    const pendingRetry = table.getByRole("button", {
      name: /retry incident handbook/i,
    });
    await waitFor(() => expect(pendingRetry).toBeDisabled());
    expect(pendingRetry).toHaveAttribute("aria-busy", "true");
    expect(pendingRetry).toHaveTextContent("Processing");
    await user.click(pendingRetry);
    expect(runtimeApi.retryIngestion).toHaveBeenCalledTimes(1);

    resolveRetry?.({
      id: incident.id,
      status: "pending",
      temporal_workflow_id: "workflow-retry",
      title: incident.title,
    });
  });
});
