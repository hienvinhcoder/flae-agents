import { Database, FilePlus2, PencilLine } from "lucide-react";
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
import { KnowledgeReadiness } from "../ui/KnowledgeReadiness";
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

  const stats = useMemo(() => {
    const total = documents.length;
    const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunk_count ?? 0), 0);
    const completed = documents.filter((doc) => doc.status === "completed").length;
    const processing = documents.filter(
      (doc) => doc.status === "processing" || doc.status === "pending",
    ).length;
    const failed = documents.filter((doc) => doc.status === "failed").length;
    return { completed, failed, processing, total, totalChunks };
  }, [documents]);
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

  if (!workspaceId) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <PageHeader
          description={t("KNOWLEDGE.WORKSPACE_REQUIRED")}
          title={t("KNOWLEDGE.TITLE")}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 md:gap-8">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2 font-semibold text-ui-ink no-underline transition-colors duration-150 hover:border-ui-line-strong hover:bg-ui-interactive motion-reduce:transition-none"
              to="graph"
            >
              <Database aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {t("KNOWLEDGE.OPEN_GRAPH")}
            </Link>
            <Button onClick={() => setTextOpen(true)} variant="secondary">
              <PencilLine aria-hidden className="h-4 w-4" />
              {t("KNOWLEDGE.ADD_TEXT")}
            </Button>
            <Button
              onClick={() => setUploadOpen(true)}
              variant="primary"
            >
              <FilePlus2 aria-hidden className="h-4 w-4" />
              {t("KNOWLEDGE.UPLOAD_FILE")}
            </Button>
          </>
        }
        description={t("KNOWLEDGE.DESCRIPTION")}
        eyebrow={t("KNOWLEDGE.EYEBROW")}
        title={t("KNOWLEDGE.TITLE")}
      />

      <KnowledgeReadiness
        completed={stats.completed}
        failed={stats.failed}
        onReviewFailed={() => setStatus("failed")}
        processing={stats.processing}
        total={stats.total}
        totalChunks={stats.totalChunks}
      />

      <section
        aria-labelledby="knowledge-documents-title"
        className="overflow-hidden rounded-ui-panel border border-ui-divider bg-ui-raised"
      >
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2
              className="text-xl font-semibold tracking-[-0.01em] text-ui-ink"
              id="knowledge-documents-title"
            >
              {t("KNOWLEDGE.LIBRARY_TITLE")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ui-ink-secondary">
              {t("KNOWLEDGE.TABLE_DESCRIPTION")}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums text-ui-ink-muted">
            {t("KNOWLEDGE.RESULT_COUNT", {
              count: filteredDocuments.length,
              total: documents.length,
            })}
          </p>
        </div>

        {documents.length > 0 ? (
          <KnowledgeLibraryToolbar
            hasActiveFilters={Boolean(search.trim()) || status !== "all"}
            onClearFilters={() => {
              setSearch("");
              setStatus("all");
            }}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onViewModeChange={handleSetViewMode}
            search={search}
            status={status}
            viewMode={viewMode}
          />
        ) : null}

        <div className={viewMode === "grid" ? "p-5 sm:p-6" : ""}>
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
            <DocumentGrid
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
          ) : (
            <DocumentTable
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
        </div>
      </section>

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
        isDeleting={knowledge.remove.isPending}
        isLoading={knowledge.document.isPending}
        isRetrying={Boolean(
          selectedDocumentId && pendingRetryIds.has(selectedDocumentId),
        )}
        onClose={() => setSelectedDocumentId(null)}
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
