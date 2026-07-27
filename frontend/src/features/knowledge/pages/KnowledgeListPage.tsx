import { Database, FilePlus2, PencilLine, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Select } from "../../../shared/ui/Select";
import { useKnowledge } from "../hooks/use-knowledge";
import type { KnowledgeDocument } from "../types/knowledge";
import { DocumentDetailPanel } from "../ui/DocumentDetailPanel";
import { DocumentTable } from "../ui/DocumentTable";
import { TextInputDialog } from "../ui/TextInputDialog";
import { UploadDialog } from "../ui/UploadDialog";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

const EMPTY_DOCUMENTS: readonly KnowledgeDocument[] = [];

export function KnowledgeListPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const pendingRetryIdsRef = useRef<Set<string>>(new Set());
  const [pendingRetryIds, setPendingRetryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const knowledge = useKnowledge(workspaceId, selectedDocumentId);
  const documents = knowledge.documents.data ?? EMPTY_DOCUMENTS;
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

  const retryDocument = async (documentId: string) => {
    if (pendingRetryIdsRef.current.has(documentId)) return;
    const pending = new Set(pendingRetryIdsRef.current).add(documentId);
    pendingRetryIdsRef.current = pending;
    setPendingRetryIds(pending);
    try {
      await knowledge.retry.mutateAsync(documentId);
    } catch {
      /* Mutation state exposes the retry error while keeping the action safe. */
    } finally {
      const remaining = new Set(pendingRetryIdsRef.current);
      remaining.delete(documentId);
      pendingRetryIdsRef.current = remaining;
      setPendingRetryIds(remaining);
    }
  };
  const retry = (document: KnowledgeDocument) => {
    void retryDocument(document.id);
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
    <section className="mx-auto grid w-full max-w-7xl gap-8">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2 font-semibold text-ui-ink transition-colors duration-200 hover:bg-ui-interactive motion-reduce:transition-none"
              to="graph"
            >
              <Database aria-hidden className="h-4 w-4 text-accent-ai" />
              {t("KNOWLEDGE.OPEN_GRAPH")}
            </Link>
            <Button onClick={() => setTextOpen(true)} variant="secondary">
              <PencilLine aria-hidden className="h-4 w-4" />
              {t("KNOWLEDGE.ADD_TEXT")}
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <FilePlus2 aria-hidden className="h-4 w-4" />
              {t("KNOWLEDGE.UPLOAD_FILE")}
            </Button>
          </>
        }
        description={t("KNOWLEDGE.DESCRIPTION")}
        eyebrow={t("KNOWLEDGE.EYEBROW")}
        title={t("KNOWLEDGE.TITLE")}
      />

      <section aria-labelledby="knowledge-documents-title">
        <div className="grid gap-4 border-y border-ui-divider bg-ui-raised/45 px-4 py-4 lg:grid-cols-[minmax(12rem,0.55fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <h2
              className="text-lg font-semibold text-ui-ink"
              id="knowledge-documents-title"
            >
              {t("KNOWLEDGE.TABLE_CAPTION")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ui-ink-muted"
              />
              <label className="sr-only" htmlFor="knowledge-search">
                {t("KNOWLEDGE.SEARCH_LABEL")}
              </label>
              <input
                className="min-h-11 w-full rounded-ui-control border border-ui-line bg-ui-raised pl-10 pr-3 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong motion-reduce:transition-none"
                id="knowledge-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("KNOWLEDGE.SEARCH_PLACEHOLDER")}
                type="search"
                value={search}
              />
            </div>
            <Select
              className="w-full"
              label={t("KNOWLEDGE.STATUS_FILTER")}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { label: t("KNOWLEDGE.ALL_STATUSES"), value: "all" },
                { label: t("KNOWLEDGE.STATUS_PENDING"), value: "pending" },
                {
                  label: t("KNOWLEDGE.STATUS_PROCESSING"),
                  value: "processing",
                },
                {
                  label: t("KNOWLEDGE.STATUS_COMPLETED"),
                  value: "completed",
                },
                { label: t("KNOWLEDGE.STATUS_FAILED"), value: "failed" },
              ]}
              value={status}
            />
          </div>
        </div>

        <div className="mt-4">
          {knowledge.documents.isError ? (
            <ErrorState
              message={
                errorMessage(knowledge.documents.error) ??
                t("KNOWLEDGE.LOAD_ERROR")
              }
              onRetry={() => void knowledge.documents.refetch()}
              title={t("KNOWLEDGE.LOAD_ERROR")}
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

      {errorMessage(knowledge.retry.error) ||
      errorMessage(knowledge.remove.error) ? (
        <p className="mt-4 text-state-danger" role="alert">
          {errorMessage(knowledge.retry.error) ??
            errorMessage(knowledge.remove.error)}
        </p>
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
        onRetry={(documentId) => void retryDocument(documentId)}
        open={Boolean(selectedDocumentId && knowledge.selectedDocumentExists)}
      />
    </section>
  );
}
