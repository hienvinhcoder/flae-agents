import { FilePlus2, Network, PencilLine } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { useKnowledge } from "../hooks/use-knowledge";
import type { KnowledgeDocument } from "../types/knowledge";
import { DocumentDetailPanel } from "../ui/DocumentDetailPanel";
import { DocumentGrid } from "../ui/DocumentGrid";
import { DocumentTable } from "../ui/DocumentTable";
import { KnowledgeLibraryToolbar } from "../ui/KnowledgeLibraryToolbar";
import { TextInputDialog } from "../ui/TextInputDialog";
import { UploadDialog } from "../ui/UploadDialog";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

const EMPTY_DOCUMENTS: readonly KnowledgeDocument[] = [];
const EMPTY_PENDING_RETRY_IDS: ReadonlySet<string> = new Set();
const EMPTY_RETRY_ERRORS: ReadonlyMap<string, string> = new Map();

const VIEW_MODE_STORAGE_KEY = "flae_knowledge_view_mode";
const DEFAULT_VIEW_MODE: "grid" | "list" = "list";

function readViewMode(): "grid" | "list" {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === "grid" || stored === "list" ? stored : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

interface RetryErrorState {
  errors: ReadonlyMap<string, string>;
  workspaceId: string | null;
}

function retryOperationKey(workspaceId: string, documentId: string) {
  return JSON.stringify([workspaceId, documentId]);
}

export function KnowledgeListPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(readViewMode);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors in test environment
    }
  };
  const pendingRetryKeysRef = useRef<Set<string>>(new Set());
  const [pendingRetryIdsByWorkspace, setPendingRetryIdsByWorkspace] = useState<
    ReadonlyMap<string, ReadonlySet<string>>
  >(
    () => new Map(),
  );
  const [retryErrorState, setRetryErrorState] = useState<RetryErrorState>(() => ({
    errors: new Map(),
    workspaceId,
  }));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const knowledge = useKnowledge(workspaceId, selectedDocumentId);
  const documents = knowledge.documents.data ?? EMPTY_DOCUMENTS;

  const pendingRetryIds = workspaceId
    ? (pendingRetryIdsByWorkspace.get(workspaceId) ?? EMPTY_PENDING_RETRY_IDS)
    : EMPTY_PENDING_RETRY_IDS;
  const retryErrors =
    retryErrorState.workspaceId === workspaceId
      ? retryErrorState.errors
      : EMPTY_RETRY_ERRORS;
  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesStatus = status === "all" || document.status === status;
      const matchesSearch =
        !query ||
        document.title.toLowerCase().includes(query) ||
        document.description?.toLowerCase().includes(query) ||
        document.file_name?.toLowerCase().includes(query);
      return matchesStatus && Boolean(matchesSearch);
    });
  }, [documents, search, status]);

  const beginRetryErrorScope = (
    documentId: string,
    retryWorkspaceId: string,
  ) => {
    setRetryErrorState((current) => {
      const errors = new Map(
        current.workspaceId === retryWorkspaceId
          ? current.errors
          : EMPTY_RETRY_ERRORS,
      );
      errors.delete(documentId);
      return { errors, workspaceId: retryWorkspaceId };
    });
  };
  const clearRetryError = (
    documentId: string,
    retryWorkspaceId: string,
  ) => {
    setRetryErrorState((current) => {
      if (
        current.workspaceId !== retryWorkspaceId ||
        !current.errors.has(documentId)
      ) {
        return current;
      }
      const errors = new Map(current.errors);
      errors.delete(documentId);
      return { errors, workspaceId: retryWorkspaceId };
    });
  };
  const retryDocument = async (documentId: string, title: string) => {
    const retryWorkspaceId = workspaceId;
    if (!retryWorkspaceId) return;
    const operationKey = retryOperationKey(retryWorkspaceId, documentId);
    if (pendingRetryKeysRef.current.has(operationKey)) return;
    beginRetryErrorScope(documentId, retryWorkspaceId);
    pendingRetryKeysRef.current.add(operationKey);
    setPendingRetryIdsByWorkspace((current) => {
      const documentIds = new Set(
        current.get(retryWorkspaceId) ?? EMPTY_PENDING_RETRY_IDS,
      );
      documentIds.add(documentId);
      return new Map(current).set(retryWorkspaceId, documentIds);
    });
    try {
      await knowledge.retry.mutateAsync(documentId);
      clearRetryError(documentId, retryWorkspaceId);
    } catch {
      setRetryErrorState((current) => {
        if (current.workspaceId !== retryWorkspaceId) return current;
        const errors = new Map(current.errors);
        errors.set(documentId, t("KNOWLEDGE.RETRY_FAILED", { title }));
        return { errors, workspaceId: retryWorkspaceId };
      });
    } finally {
      pendingRetryKeysRef.current.delete(operationKey);
      setPendingRetryIdsByWorkspace((current) => {
        const currentDocumentIds = current.get(retryWorkspaceId);
        if (!currentDocumentIds?.has(documentId)) return current;
        const documentIds = new Set(currentDocumentIds);
        documentIds.delete(documentId);
        const remaining = new Map(current);
        if (documentIds.size > 0) {
          remaining.set(retryWorkspaceId, documentIds);
        } else {
          remaining.delete(retryWorkspaceId);
        }
        return remaining;
      });
    }
  };
  const retry = (document: KnowledgeDocument) => {
    void retryDocument(document.id, document.title);
  };
  const remove = async (documentId: string, title: string) => {
    if (!window.confirm(t("KNOWLEDGE.DELETE_CONFIRM", { title }))) return;
    try {
      const deleted = await knowledge.remove.mutateAsync(documentId);
      if (deleted && selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
      }
    } catch {
      /* Mutation state renders a retryable error without leaking the rejection. */
    }
  };
  const deletingDocumentId = knowledge.remove.isPending
    ? (knowledge.remove.variables ?? null)
    : null;

  if (!workspaceId) {
    return (
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          description={t("KNOWLEDGE.WORKSPACE_REQUIRED")}
          title={t("KNOWLEDGE.TITLE")}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl animate-ui-enter flex-col gap-6">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground no-underline transition-colors hover:bg-muted"
              to="graph"
            >
              <Network aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              {t("KNOWLEDGE.OPEN_GRAPH")}
            </Link>
            <Button onClick={() => setTextOpen(true)} variant="secondary">
              <PencilLine aria-hidden className="h-4 w-4 text-muted-foreground" />
              {t("KNOWLEDGE.ADD_TEXT")}
            </Button>
            <Button onClick={() => setUploadOpen(true)} variant="primary">
              <FilePlus2 aria-hidden className="h-4 w-4" />
              {t("KNOWLEDGE.UPLOAD_FILE")}
            </Button>
          </>
        }
        description={t("KNOWLEDGE.DESCRIPTION")}
        eyebrow={t("KNOWLEDGE.EYEBROW")}
        title={t("KNOWLEDGE.TITLE")}
      />

      <KnowledgeLibraryToolbar
        hasActiveFilters={Boolean(search.trim()) || status !== "all"}
        onClearFilters={() => {
          setSearch("");
          setStatus("all");
        }}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onViewModeChange={handleSetViewMode}
        resultCount={filteredDocuments.length}
        search={search}
        status={status}
        totalCount={documents.length}
        viewMode={viewMode}
      />

      {knowledge.documents.isError ? (
        <ErrorState
          message={
            errorMessage(knowledge.documents.error) ??
            t("KNOWLEDGE.LOAD_ERROR")
          }
          onRetry={() => void knowledge.documents.refetch()}
          retryLabel={t("KNOWLEDGE.RETRY_LIST")}
          title={t("KNOWLEDGE.LOAD_ERROR")}
        />
      ) : viewMode === "grid" ? (
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <DocumentGrid
            deletingDocumentId={deletingDocumentId}
            documents={filteredDocuments}
            emptyMessage={t(
              documents.length === 0
                ? "KNOWLEDGE.EMPTY_STATE_DESC"
                : "KNOWLEDGE.FILTER_EMPTY_DESCRIPTION",
            )}
            isLoading={knowledge.documents.isPending}
            onDelete={(document) => void remove(document.id, document.title)}
            onRetry={retry}
            onView={(document) => setSelectedDocumentId(document.id)}
            retryingDocumentIds={pendingRetryIds}
          />
        </div>
      ) : (
        <DocumentTable
          deletingDocumentId={deletingDocumentId}
          documents={filteredDocuments}
          emptyMessage={t(
            documents.length === 0
              ? "KNOWLEDGE.EMPTY_STATE_DESC"
              : "KNOWLEDGE.FILTER_EMPTY_DESCRIPTION",
          )}
          isLoading={knowledge.documents.isPending}
          onDelete={(document) => void remove(document.id, document.title)}
          onRetry={retry}
          onView={(document) => setSelectedDocumentId(document.id)}
          retryingDocumentIds={pendingRetryIds}
        />
      )}

      {retryErrors.size > 0 || errorMessage(knowledge.remove.error) ? (
        <div className="mt-4 grid gap-1 text-state-danger" role="alert">
          {[...retryErrors].map(([documentId, message]) => (
            <p key={documentId}>{message}</p>
          ))}
          {errorMessage(knowledge.remove.error) ? (
            <p>{errorMessage(knowledge.remove.error)}</p>
          ) : null}
        </div>
      ) : null}

      <UploadDialog
        error={errorMessage(knowledge.upload.error)}
        isSubmitting={knowledge.upload.isPending}
        onClose={() => setUploadOpen(false)}
        onSubmit={(payload) =>
          knowledge.upload.mutateAsync(payload).then(() => undefined)
        }
        open={uploadOpen}
      />
      <TextInputDialog
        error={errorMessage(knowledge.createManual.error)}
        isSubmitting={knowledge.createManual.isPending}
        onClose={() => setTextOpen(false)}
        onSubmit={(payload) =>
          knowledge.createManual.mutateAsync(payload).then(() => undefined)
        }
        open={textOpen}
      />
      <DocumentDetailPanel
        document={knowledge.selectedDocument}
        error={errorMessage(knowledge.document.error)}
        isDeleting={Boolean(
          deletingDocumentId && deletingDocumentId === selectedDocumentId,
        )}
        isLoading={knowledge.document.isPending}
        isRetrying={Boolean(
          selectedDocumentId && pendingRetryIds.has(selectedDocumentId),
        )}
        onClose={() => {
          if (deletingDocumentId && deletingDocumentId === selectedDocumentId) {
            return;
          }
          setSelectedDocumentId(null);
        }}
        onDelete={(documentId) => {
          const title =
            knowledge.selectedDocument?.title ?? t("KNOWLEDGE.THIS_DOCUMENT");
          void remove(documentId, title);
        }}
        onRetry={(documentId) =>
          void retryDocument(
            documentId,
            knowledge.selectedDocument?.title ?? t("KNOWLEDGE.THIS_DOCUMENT"),
          )
        }
        open={Boolean(selectedDocumentId && knowledge.selectedDocumentExists)}
      />
    </section>
  );
}
