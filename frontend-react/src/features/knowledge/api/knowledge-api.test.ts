import { describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  DataApiRequestOptions,
} from "../../../core/api/client";
import {
  createManualDocument,
  deleteDocument,
  getDocument,
  getIngestionStatus,
  listDocuments,
  retryIngestion,
  uploadDocument,
} from "./knowledge-api";

const listItem = {
  chunk_count: 4,
  created_at: "2026-07-24T00:00:00Z",
  description: "Product reference",
  document_type: "markdown",
  entity_count: 3,
  file_name: "guide.md",
  file_size: 2048,
  id: "11111111-1111-4111-8111-111111111111",
  relation_count: 2,
  status: "completed",
  title: "Guide",
  updated_at: "2026-07-24T00:05:00Z",
  uploaded_by: "firebase-1",
} as const;

const uploadResponse = {
  id: "22222222-2222-4222-8222-222222222222",
  status: "pending",
  temporal_workflow_id: "workflow-1",
  title: "New guide",
} as const;

describe("knowledge API", () => {
  it("lists and loads documents with workspace-scoped requests", async () => {
    const detail = {
      ...listItem,
      content_text: "Reference content",
      error_message: null,
      gcs_path: "gs://knowledge/guide.md",
      mime_type: "text/markdown",
      processing_time_seconds: 1.5,
      temporal_workflow_id: "workflow-complete",
      token_usage: { input: 120 },
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce([listItem])
      .mockResolvedValueOnce(detail);
    const client = { request } as ApiClient;

    await expect(listDocuments("ws-1", client)).resolves.toEqual([listItem]);
    await expect(
      getDocument("ws-1", listItem.id, client),
    ).resolves.toEqual(detail);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      method: "GET",
      path: "/knowledge-base",
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      method: "GET",
      path: `/knowledge-base/${listItem.id}`,
      workspaceId: "ws-1",
    });
  });

  it("uploads a supported file as multipart without inventing a full document", async () => {
    const request = vi.fn().mockResolvedValue(uploadResponse);
    const file = new File(["# New"], "new-guide.md", {
      type: "text/markdown",
    });

    await expect(
      uploadDocument(
        "ws-1",
        { description: "Reference", file, title: "New guide" },
        { request } as ApiClient,
      ),
    ).resolves.toEqual(uploadResponse);

    const options = request.mock.calls[0]?.[0] as DataApiRequestOptions;
    expect(options).toMatchObject({
      auth: true,
      method: "POST",
      path: "/knowledge-base/upload",
      workspaceId: "ws-1",
    });
    expect(options.body).toBeInstanceOf(FormData);
    if (!(options.body instanceof FormData)) throw new Error("Expected FormData");
    expect(options.body.get("file")).toBe(file);
    expect(options.body.get("title")).toBe("New guide");
    expect(options.body.get("description")).toBe("Reference");
  });

  it("preserves manual, retry, delete, and typed status contracts", async () => {
    const status = {
      chunk_count: null,
      document_id: uploadResponse.id,
      entity_count: null,
      error_message: null,
      processing_time_seconds: null,
      relation_count: null,
      status: "processing",
    } as const;
    const request = vi
      .fn()
      .mockResolvedValueOnce(uploadResponse)
      .mockResolvedValueOnce(uploadResponse)
      .mockResolvedValueOnce(status)
      .mockResolvedValueOnce(true);
    const client = { request } as ApiClient;
    const manual = {
      content_text: "Knowledge content",
      description: "Reference",
      title: "New guide",
    };

    await expect(createManualDocument("ws-1", manual, client)).resolves.toEqual(
      uploadResponse,
    );
    await expect(
      retryIngestion("ws-1", uploadResponse.id, client),
    ).resolves.toEqual(uploadResponse);
    await expect(
      getIngestionStatus("ws-1", uploadResponse.id, client),
    ).resolves.toEqual(status);
    await expect(
      deleteDocument("ws-1", uploadResponse.id, client),
    ).resolves.toBe(true);

    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      body: manual,
      method: "POST",
      path: "/knowledge-base/manual",
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: {},
      method: "POST",
      path: `/knowledge-base/${uploadResponse.id}/retry`,
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      auth: true,
      method: "GET",
      path: `/knowledge-base/${uploadResponse.id}/status`,
      workspaceId: "ws-1",
    });
    expect(request).toHaveBeenNthCalledWith(4, {
      auth: true,
      method: "DELETE",
      path: `/knowledge-base/${uploadResponse.id}`,
      workspaceId: "ws-1",
    });
  });

  it("rejects missing workspace IDs before issuing a request", async () => {
    const request = vi.fn();

    await expect(listDocuments(null, { request } as ApiClient)).rejects.toThrow(
      /workspace/i,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects malformed backend data with a safe error", async () => {
    const request = vi.fn().mockResolvedValue([
      { ...listItem, id: "not-a-uuid", title: "Private acquisition notes" },
    ]);
    const error: unknown = await listDocuments("ws-1", {
      request,
    } as ApiClient).catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      kind: "server",
      message: "The server returned invalid knowledge document data.",
    });
    expect(String(error)).not.toContain("Private acquisition notes");
  });
});
