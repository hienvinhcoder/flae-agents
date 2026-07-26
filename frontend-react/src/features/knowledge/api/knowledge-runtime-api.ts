import { createApiClient } from "../../../core/api/client";
import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import * as knowledgeApi from "./knowledge-api";
import type {
  ManualDocumentPayload,
  UploadDocumentPayload,
} from "../types/knowledge";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: getAuthToken,
});

export const listDocuments = (workspaceId: string) =>
  knowledgeApi.listDocuments(workspaceId, client);
export const getDocument = (workspaceId: string, documentId: string) =>
  knowledgeApi.getDocument(workspaceId, documentId, client);
export const uploadDocument = (
  workspaceId: string,
  payload: UploadDocumentPayload,
) => knowledgeApi.uploadDocument(workspaceId, payload, client);
export const createManualDocument = (
  workspaceId: string,
  payload: ManualDocumentPayload,
) => knowledgeApi.createManualDocument(workspaceId, payload, client);
export const retryIngestion = (workspaceId: string, documentId: string) =>
  knowledgeApi.retryIngestion(workspaceId, documentId, client);
export const getIngestionStatus = (
  workspaceId: string,
  documentId: string,
) => knowledgeApi.getIngestionStatus(workspaceId, documentId, client);
export const deleteDocument = (workspaceId: string, documentId: string) =>
  knowledgeApi.deleteDocument(workspaceId, documentId, client);
export const getKnowledgeGraph = (
  workspaceId: string,
  signal?: AbortSignal,
) => knowledgeApi.getKnowledgeGraph(workspaceId, client, signal);
