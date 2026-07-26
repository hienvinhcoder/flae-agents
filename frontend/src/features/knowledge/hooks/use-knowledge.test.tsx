import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../../../shared/lib/query-keys";
import type { KnowledgeDocument } from "../types/knowledge";
import {
  knowledgeRefetchInterval,
  useKnowledge,
} from "./use-knowledge";

const runtimeApi = vi.hoisted(() => ({
  createManualDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  retryIngestion: vi.fn(),
  uploadDocument: vi.fn(),
}));

vi.mock("../api/knowledge-runtime-api", () => runtimeApi);

const pendingDocument: KnowledgeDocument = {
  chunk_count: null,
  created_at: "2026-07-24T00:00:00Z",
  description: null,
  document_type: "pdf",
  entity_count: null,
  file_name: "roadmap.pdf",
  file_size: 1024,
  id: "11111111-1111-4111-8111-111111111111",
  relation_count: null,
  status: "pending",
  title: "Roadmap",
  updated_at: "2026-07-24T00:00:00Z",
  uploaded_by: "firebase-1",
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

async function flushQuery() {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("knowledge queries", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls only while at least one document is pending or processing", () => {
    expect(knowledgeRefetchInterval([pendingDocument])).toBe(5_000);
    expect(
      knowledgeRefetchInterval([
        { ...pendingDocument, status: "processing" },
      ]),
    ).toBe(5_000);
    expect(
      knowledgeRefetchInterval([
        { ...pendingDocument, status: "completed" },
        { ...pendingDocument, id: "doc-2", status: "failed" },
      ]),
    ).toBe(false);
    expect(knowledgeRefetchInterval(undefined)).toBe(false);
  });

  it("stops polling after documents reach a terminal state", async () => {
    vi.useFakeTimers();
    runtimeApi.listDocuments
      .mockResolvedValueOnce([pendingDocument])
      .mockResolvedValue([{ ...pendingDocument, status: "completed" }]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useKnowledge("ws-1", null), {
      wrapper: createWrapper(queryClient),
    });
    await flushQuery();
    expect(result.current.documents.data?.[0]?.status).toBe("pending");

    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    await flushQuery();
    expect(runtimeApi.listDocuments).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryData<KnowledgeDocument[]>(
        queryKeys.knowledge("ws-1"),
      )?.[0]?.status,
    ).toBe("completed");

    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(runtimeApi.listDocuments).toHaveBeenCalledTimes(2);
  });

  it("cleans up polling when the workspace changes and when unmounted", async () => {
    vi.useFakeTimers();
    runtimeApi.listDocuments.mockResolvedValue([pendingDocument]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender, unmount } = renderHook(
      ({ workspaceId }) => useKnowledge(workspaceId, null),
      {
        initialProps: { workspaceId: "ws-1" },
        wrapper: createWrapper(queryClient),
      },
    );
    await flushQuery();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(runtimeApi.listDocuments).toHaveBeenCalledWith("ws-1");
    const oldWorkspaceCalls = runtimeApi.listDocuments.mock.calls.filter(
      ([workspaceId]) => workspaceId === "ws-1",
    ).length;

    rerender({ workspaceId: "ws-2" });
    await flushQuery();
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(runtimeApi.listDocuments).toHaveBeenCalledWith("ws-2");
    expect(
      runtimeApi.listDocuments.mock.calls.filter(
        ([workspaceId]) => workspaceId === "ws-1",
      ),
    ).toHaveLength(oldWorkspaceCalls);

    const callsBeforeUnmount = runtimeApi.listDocuments.mock.calls.length;
    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(runtimeApi.listDocuments).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it("invalidates only the active workspace list after mutations", async () => {
    runtimeApi.listDocuments.mockResolvedValue([]);
    runtimeApi.retryIngestion.mockResolvedValue({
      id: pendingDocument.id,
      status: "pending",
      temporal_workflow_id: "workflow-2",
      title: pendingDocument.title,
    });
    runtimeApi.deleteDocument.mockResolvedValue(true);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useKnowledge("ws-1", null), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(result.current.documents.isSuccess).toBe(true));

    await act(() => result.current.retry.mutateAsync(pendingDocument.id));
    await act(() => result.current.remove.mutateAsync(pendingDocument.id));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.knowledge("ws-1"),
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: queryKeys.knowledge("ws-2"),
    });
  });

  it("keeps selected detail fields synchronized with a refreshed list item", async () => {
    runtimeApi.listDocuments
      .mockResolvedValueOnce([pendingDocument])
      .mockResolvedValue([{ ...pendingDocument, chunk_count: 8, status: "completed" }]);
    runtimeApi.getDocument
      .mockResolvedValueOnce({
        ...pendingDocument,
        content_text: "Queued content",
        error_message: null,
        gcs_path: "gs://knowledge/roadmap.pdf",
        mime_type: "application/pdf",
        processing_time_seconds: null,
        temporal_workflow_id: "workflow-1",
        token_usage: null,
      })
      .mockResolvedValue({
        ...pendingDocument,
        chunk_count: 8,
        content_text: "Processed roadmap content",
        error_message: null,
        gcs_path: "gs://knowledge/roadmap.pdf",
        mime_type: "application/pdf",
        processing_time_seconds: 3.2,
        status: "completed",
        temporal_workflow_id: "workflow-1",
        token_usage: { input: 240 },
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useKnowledge("ws-1", pendingDocument.id),
      { wrapper: createWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.document.isSuccess).toBe(true));
    expect(result.current.selectedDocument?.status).toBe("pending");

    await act(() => result.current.documents.refetch());

    await waitFor(() =>
      expect(result.current.selectedDocument).toMatchObject({
        chunk_count: 8,
        content_text: "Processed roadmap content",
        processing_time_seconds: 3.2,
        status: "completed",
        token_usage: { input: 240 },
      }),
    );
    expect(runtimeApi.getDocument).toHaveBeenCalledTimes(2);
  });

  it("preserves cached documents when deletion resolves false", async () => {
    runtimeApi.listDocuments.mockResolvedValue([pendingDocument]);
    runtimeApi.deleteDocument.mockResolvedValue(false);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useKnowledge("ws-1", null), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(result.current.documents.isSuccess).toBe(true));
    invalidate.mockClear();

    await expect(
      act(() => result.current.remove.mutateAsync(pendingDocument.id)),
    ).resolves.toBe(false);

    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: queryKeys.knowledge("ws-1"),
    });
    expect(queryClient.getQueryData(queryKeys.knowledge("ws-1"))).toEqual([
      pendingDocument,
    ]);
  });
});
