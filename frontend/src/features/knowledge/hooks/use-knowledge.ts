import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { queryKeys } from "../../../shared/lib/query-keys";
import * as runtimeApi from "../api/knowledge-runtime-api";
import type {
  KnowledgeDocument,
  ManualDocumentPayload,
  UploadDocumentPayload,
} from "../types/knowledge";

const POLLING_INTERVAL_MS = 5_000;

export function knowledgeRefetchInterval(
  documents: readonly KnowledgeDocument[] | undefined,
) {
  return documents?.some(
    (document) =>
      document.status === "pending" || document.status === "processing",
  )
    ? POLLING_INTERVAL_MS
    : false;
}

export function useKnowledge(
  workspaceId: string | null,
  selectedDocumentId: string | null,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(workspaceId);
  const workspaceKey = workspaceId ?? "none";
  const documents = useQuery({
    enabled,
    queryFn: () => runtimeApi.listDocuments(workspaceId as string),
    queryKey: queryKeys.knowledge(workspaceKey),
    refetchInterval: (query) =>
      knowledgeRefetchInterval(query.state.data),
  });
  const selectedDocumentExists =
    !documents.isSuccess ||
    !selectedDocumentId ||
    documents.data.some((document) => document.id === selectedDocumentId);
  const document = useQuery({
    enabled: enabled && Boolean(selectedDocumentId) && selectedDocumentExists,
    queryFn: () =>
      runtimeApi.getDocument(
        workspaceId as string,
        selectedDocumentId as string,
      ),
    queryKey: queryKeys.knowledgeDocument(
      workspaceKey,
      selectedDocumentId ?? "none",
    ),
  });
  const selectedListDocument = documents.data?.find(
    (candidate) => candidate.id === selectedDocumentId,
  );
  const selectedListVersion = selectedListDocument
    ? [
        selectedListDocument.id,
        selectedListDocument.updated_at,
        selectedListDocument.status,
        selectedListDocument.chunk_count,
        selectedListDocument.entity_count,
        selectedListDocument.relation_count,
      ].join(":")
    : null;
  const detailNeedsRefresh = Boolean(
    document.data &&
      selectedListDocument &&
      (document.data.status !== selectedListDocument.status ||
        document.data.updated_at !== selectedListDocument.updated_at ||
        document.data.chunk_count !== selectedListDocument.chunk_count ||
        document.data.entity_count !== selectedListDocument.entity_count ||
        document.data.relation_count !== selectedListDocument.relation_count),
  );
  const refetchDocument = document.refetch;
  const lastDetailRefreshVersion = useRef<string | null>(null);
  useEffect(() => {
    if (
      !detailNeedsRefresh ||
      !selectedListVersion ||
      document.isFetching ||
      lastDetailRefreshVersion.current === selectedListVersion
    )
      return;
    lastDetailRefreshVersion.current = selectedListVersion;
    void refetchDocument();
  }, [
    detailNeedsRefresh,
    document.isFetching,
    refetchDocument,
    selectedListVersion,
  ]);
  const selectedDocument =
    document.data && selectedListDocument
      ? { ...document.data, ...selectedListDocument }
      : document.data;

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.knowledge(workspaceId as string),
    });
  const upload = useMutation({
    mutationFn: (payload: UploadDocumentPayload) =>
      runtimeApi.uploadDocument(workspaceId as string, payload),
    onSuccess: invalidateList,
  });
  const createManual = useMutation({
    mutationFn: (payload: ManualDocumentPayload) =>
      runtimeApi.createManualDocument(workspaceId as string, payload),
    onSuccess: invalidateList,
  });
  const retry = useMutation({
    mutationFn: (documentId: string) =>
      runtimeApi.retryIngestion(workspaceId as string, documentId),
    onSuccess: (_response, documentId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.knowledgeDocument(
          workspaceId as string,
          documentId,
        ),
      });
      return invalidateList();
    },
  });
  const remove = useMutation({
    mutationFn: (documentId: string) =>
      runtimeApi.deleteDocument(workspaceId as string, documentId),
    onSuccess: (deleted, documentId) => {
      if (!deleted) return undefined;
      queryClient.removeQueries({
        queryKey: queryKeys.knowledgeDocument(
          workspaceId as string,
          documentId,
        ),
      });
      return invalidateList();
    },
  });

  return {
    createManual,
    document,
    documents,
    remove,
    retry,
    selectedDocument,
    selectedDocumentExists,
    upload,
  };
}
