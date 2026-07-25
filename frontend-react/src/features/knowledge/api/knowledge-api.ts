import type { ApiClient } from "../../../core/api/client";
import { AppError } from "../../../core/api/errors";
import {
  documentUploadResponseSchema,
  ingestionStatusSchema,
  knowledgeDocumentDetailSchema,
  knowledgeDocumentSchema,
  type DocumentUploadResponse,
  type IngestionStatus,
  type KnowledgeDocument,
  type KnowledgeDocumentDetail,
  type ManualDocumentPayload,
  type UploadDocumentPayload,
} from "../types/knowledge";
import {
  knowledgeGraphDataSchema,
  type KnowledgeGraphData,
} from "../graph/types";

function requireWorkspaceId(workspaceId: string | null) {
  if (!workspaceId?.trim()) {
    throw new AppError({
      kind: "validation",
      message: "A workspace is required before making this request.",
      retryable: false,
    });
  }
  return workspaceId;
}

function invalidData(message: string) {
  return new AppError({ kind: "server", message, retryable: false });
}

function parseUploadResponse(data: unknown) {
  const result = documentUploadResponseSchema.safeParse(data);
  if (!result.success) {
    throw invalidData("The server returned invalid document workflow data.");
  }
  return result.data;
}

export async function listDocuments(
  workspaceId: string | null,
  client: ApiClient,
): Promise<KnowledgeDocument[]> {
  const id = requireWorkspaceId(workspaceId);
  const result = knowledgeDocumentSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: "/knowledge-base",
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid knowledge document data.");
  }
  return result.data;
}

export async function getDocument(
  workspaceId: string | null,
  documentId: string,
  client: ApiClient,
): Promise<KnowledgeDocumentDetail> {
  const id = requireWorkspaceId(workspaceId);
  const result = knowledgeDocumentDetailSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `/knowledge-base/${documentId}`,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid document detail data.");
  }
  return result.data;
}

export async function uploadDocument(
  workspaceId: string | null,
  payload: UploadDocumentPayload,
  client: ApiClient,
): Promise<DocumentUploadResponse> {
  const id = requireWorkspaceId(workspaceId);
  const body = new FormData();
  body.append("file", payload.file);
  body.append("title", payload.title);
  if (payload.description) body.append("description", payload.description);
  return parseUploadResponse(
    await client.request<unknown>({
      auth: true,
      body,
      method: "POST",
      path: "/knowledge-base/upload",
      workspaceId: id,
    }),
  );
}

export async function createManualDocument(
  workspaceId: string | null,
  payload: ManualDocumentPayload,
  client: ApiClient,
): Promise<DocumentUploadResponse> {
  const id = requireWorkspaceId(workspaceId);
  const body = {
    content_text: payload.content_text,
    description: payload.description ?? null,
    title: payload.title,
  };
  return parseUploadResponse(
    await client.request<unknown>({
      auth: true,
      body,
      method: "POST",
      path: "/knowledge-base/manual",
      workspaceId: id,
    }),
  );
}

export async function retryIngestion(
  workspaceId: string | null,
  documentId: string,
  client: ApiClient,
): Promise<DocumentUploadResponse> {
  const id = requireWorkspaceId(workspaceId);
  return parseUploadResponse(
    await client.request<unknown>({
      auth: true,
      body: {},
      method: "POST",
      path: `/knowledge-base/${documentId}/retry`,
      workspaceId: id,
    }),
  );
}

export async function getIngestionStatus(
  workspaceId: string | null,
  documentId: string,
  client: ApiClient,
): Promise<IngestionStatus> {
  const id = requireWorkspaceId(workspaceId);
  const result = ingestionStatusSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `/knowledge-base/${documentId}/status`,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid ingestion status data.");
  }
  return result.data;
}

export async function deleteDocument(
  workspaceId: string | null,
  documentId: string,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const data = await client.request<unknown>({
    auth: true,
    method: "DELETE",
    path: `/knowledge-base/${documentId}`,
    workspaceId: id,
  });
  if (typeof data !== "boolean") {
    throw invalidData("The server returned invalid document deletion data.");
  }
  return data;
}

export async function getKnowledgeGraph(
  workspaceId: string | null,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<KnowledgeGraphData> {
  const id = requireWorkspaceId(workspaceId);
  const data = await client.request<unknown>({
    auth: true,
    method: "GET",
    path: "/knowledge-base/graph",
    signal,
    workspaceId: id,
  });
  if (data === null) return { edges: [], nodes: [] };
  const result = knowledgeGraphDataSchema.safeParse(data);
  if (!result.success) {
    throw invalidData("The server returned invalid knowledge graph data.");
  }
  return result.data;
}
