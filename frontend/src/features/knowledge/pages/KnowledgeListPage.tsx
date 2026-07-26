import { Database, FilePlus2, PencilLine, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
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
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
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

  const retry = (document: KnowledgeDocument) => {
    knowledge.retry.mutate(document.id);
  };
  const remove = async (documentId: string, title: string) => {
    if (!window.confirm(`Delete ${title}? Processed knowledge will also be removed.`)) return;
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
      <section className="surface-panel mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold text-ui-ink">Knowledge base</h1>
        <p className="mt-2 text-ui-ink-secondary">
          Select a workspace before managing knowledge documents.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="knowledge-title" className="mx-auto w-full max-w-7xl">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-metadata">Workspace intelligence</p>
          <h1 className="mt-2 text-[1.75rem] font-bold text-ui-ink" id="knowledge-title">
            Knowledge base
          </h1>
          <p className="mt-2 max-w-2xl text-ui-ink-secondary">
            Ingest, inspect, and maintain the source material used by workspace agents.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2 font-semibold text-ui-ink transition-colors hover:bg-ui-interactive"
            to="graph"
          >
            <Database aria-hidden className="h-4 w-4 text-accent-ai" />
            Knowledge graph
          </Link>
          <Button onClick={() => setTextOpen(true)} variant="secondary">
            <PencilLine aria-hidden className="h-4 w-4" />
            Add content
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <FilePlus2 aria-hidden className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      </header>

      <div className="surface-panel mt-6 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ui-ink-muted" />
          <label className="sr-only" htmlFor="knowledge-search">Search documents</label>
          <input
            className="min-h-11 w-full rounded-ui-control border border-ui-line bg-ui-raised pl-10 pr-3 text-ui-ink placeholder:text-ui-ink-muted"
            id="knowledge-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, description, or file name"
            type="search"
            value={search}
          />
        </div>
        <Select
          className="w-full"
          label="Status"
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Completed", value: "completed" },
            { label: "Failed", value: "failed" },
          ]}
          value={status}
        />
      </div>

      <div className="mt-5">
        {knowledge.documents.isError ? (
          <ErrorState
            message={errorMessage(knowledge.documents.error) ?? "Unable to load documents."}
            onRetry={() => void knowledge.documents.refetch()}
            title="Unable to load knowledge documents"
          />
        ) : (
          <DocumentTable
            documents={filteredDocuments}
            isLoading={knowledge.documents.isPending}
            isRetrying={knowledge.retry.isPending}
            onDelete={(document) => void remove(document.id, document.title)}
            onRetry={retry}
            onView={(document) => setSelectedDocumentId(document.id)}
            retryingDocumentId={knowledge.retry.variables}
          />
        )}
      </div>

      {errorMessage(knowledge.retry.error) || errorMessage(knowledge.remove.error) ? (
        <p className="mt-4 text-state-danger" role="alert">
          {errorMessage(knowledge.retry.error) ?? errorMessage(knowledge.remove.error)}
        </p>
      ) : null}

      <UploadDialog
        error={errorMessage(knowledge.upload.error)}
        isSubmitting={knowledge.upload.isPending}
        onClose={() => setUploadOpen(false)}
        onSubmit={(payload) => knowledge.upload.mutateAsync(payload).then(() => undefined)}
        open={uploadOpen}
      />
      <TextInputDialog
        error={errorMessage(knowledge.createManual.error)}
        isSubmitting={knowledge.createManual.isPending}
        onClose={() => setTextOpen(false)}
        onSubmit={(payload) => knowledge.createManual.mutateAsync(payload).then(() => undefined)}
        open={textOpen}
      />
      <DocumentDetailPanel
        document={knowledge.selectedDocument}
        error={errorMessage(knowledge.document.error)}
        isDeleting={knowledge.remove.isPending}
        isLoading={knowledge.document.isPending}
        isRetrying={knowledge.retry.isPending}
        onClose={() => setSelectedDocumentId(null)}
        onDelete={(documentId) => {
          const title = knowledge.selectedDocument?.title ?? "this document";
          void remove(documentId, title);
        }}
        onRetry={(documentId) => knowledge.retry.mutate(documentId)}
        open={Boolean(selectedDocumentId && knowledge.selectedDocumentExists)}
      />
    </section>
  );
}
