import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import type { KnowledgeDocument } from "../types/knowledge";
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

const incident: KnowledgeDocument = {
  chunk_count: null,
  created_at: "2026-07-24T00:00:00Z",
  description: "Incident response notes",
  document_type: "manual_input",
  entity_count: null,
  file_name: null,
  file_size: null,
  id: "22222222-2222-4222-8222-222222222222",
  relation_count: null,
  status: "failed",
  title: "Incident handbook",
  updated_at: "2026-07-24T00:05:00Z",
  uploaded_by: "owner@example.com",
};

const policy: KnowledgeDocument = {
  ...incident,
  id: "33333333-3333-4333-8333-333333333333",
  title: "Security policy",
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
}

describe("KnowledgeListPage retry errors", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.listDocuments.mockResolvedValue([incident, policy]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId("ws-1");
  });

  it("preserves document-specific retry errors across concurrent requests", async () => {
    const user = userEvent.setup();
    const requests = new Map<
      string,
      { reject: (reason?: unknown) => void; resolve: (value: unknown) => void }
    >();
    runtimeApi.retryIngestion.mockImplementation(
      (_workspaceId: string, documentId: string) =>
        new Promise((resolve, reject) => {
          requests.set(documentId, { reject, resolve });
        }),
    );
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );

    await user.click(
      table.getByRole("button", { name: /retry incident handbook/i }),
    );
    await user.click(
      table.getByRole("button", { name: /retry security policy/i }),
    );

    requests.get(incident.id)?.reject(new Error("Private ingestion failure"));
    expect(
      await screen.findByText("Could not retry Incident handbook."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(
      table.getByRole("button", { name: /retry security policy/i }),
    ).toBeDisabled();

    requests.get(policy.id)?.resolve({
      id: policy.id,
      status: "pending",
      temporal_workflow_id: "workflow-policy",
      title: policy.title,
    });
    await waitFor(() =>
      expect(
        table.getByRole("button", { name: /retry security policy/i }),
      ).not.toBeDisabled(),
    );
    expect(
      screen.getByText("Could not retry Incident handbook."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Private ingestion failure")).not.toBeInTheDocument();
  });

  it("clears a retry error on a new attempt and when the workspace changes", async () => {
    const user = userEvent.setup();
    runtimeApi.retryIngestion
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce({
        id: incident.id,
        status: "pending",
        temporal_workflow_id: "workflow-retry",
        title: incident.title,
      })
      .mockRejectedValueOnce(new Error("Second failure"));
    renderPage();
    const table = within(
      await screen.findByRole("table", { name: /knowledge documents/i }),
    );
    const retryButton = table.getByRole("button", {
      name: /retry incident handbook/i,
    });

    await user.click(retryButton);
    expect(
      await screen.findByText("Could not retry Incident handbook."),
    ).toBeInTheDocument();

    await user.click(retryButton);
    await waitFor(() =>
      expect(
        screen.queryByText("Could not retry Incident handbook."),
      ).not.toBeInTheDocument(),
    );

    await user.click(retryButton);
    expect(
      await screen.findByText("Could not retry Incident handbook."),
    ).toBeInTheDocument();
    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId("ws-2"));
    await waitFor(() =>
      expect(
        screen.queryByText("Could not retry Incident handbook."),
      ).not.toBeInTheDocument(),
    );
  });
});
