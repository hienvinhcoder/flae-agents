import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Table, type TableColumn } from "../../../shared/ui/Table";
import type { KnowledgeDocument } from "../types/knowledge";
import { StatusBadge } from "./StatusBadge";

interface DocumentTableProps {
  documents: readonly KnowledgeDocument[];
  isLoading: boolean;
  isRetrying: boolean;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
  onView: (document: KnowledgeDocument) => void;
  retryingDocumentId?: string;
}

interface DocumentActionsProps {
  document: KnowledgeDocument;
  isRetrying: boolean;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
  onView: (document: KnowledgeDocument) => void;
}

function documentTypeLabel(
  document: KnowledgeDocument,
  manualTextLabel: string,
) {
  return document.document_type === "manual_input"
    ? manualTextLabel
    : document.document_type.toUpperCase();
}

function DocumentActions({
  document,
  isRetrying,
  onDelete,
  onRetry,
  onView,
}: DocumentActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {document.status === "failed" ? (
        <Button
          aria-label={t("KNOWLEDGE.RETRY_DOCUMENT", { title: document.title })}
          className="min-w-11 px-3"
          isLoading={isRetrying}
          loadingText={t("KNOWLEDGE.STATUS_PROCESSING")}
          onClick={() => onRetry(document)}
          variant="ghost"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        aria-label={t("KNOWLEDGE.OPEN_DOCUMENT", { title: document.title })}
        className="min-w-11 px-3"
        onClick={() => onView(document)}
        variant="ghost"
      >
        <Eye aria-hidden className="h-4 w-4" />
      </Button>
      <Button
        aria-label={t("KNOWLEDGE.DELETE_DOCUMENT", { title: document.title })}
        className="min-w-11 px-3"
        onClick={() => onDelete(document)}
        variant="ghost"
      >
        <Trash2 aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DocumentTable({
  documents,
  isLoading,
  isRetrying,
  onDelete,
  onRetry,
  onView,
  retryingDocumentId,
}: DocumentTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="border-y border-ui-divider bg-ui-raised/45 p-6">
        <Skeleton label="Loading knowledge documents" lines={5} />
      </div>
    );
  }

  const columns: readonly TableColumn<KnowledgeDocument>[] = [
    {
      header: t("KNOWLEDGE.TABLE_TITLE"),
      key: "document",
      render: (document) => (
        <div>
          <strong className="block text-ui-ink">{document.title}</strong>
          <span className="block max-w-xs truncate text-sm text-ui-ink-muted">
            {document.description ||
              document.file_name ||
              t("KNOWLEDGE.NO_DESCRIPTION")}
          </span>
        </div>
      ),
    },
    {
      header: t("KNOWLEDGE.TABLE_TYPE"),
      key: "type",
      render: (document) =>
        documentTypeLabel(document, t("KNOWLEDGE.MANUAL_TEXT")),
    },
    {
      header: t("KNOWLEDGE.TABLE_STATUS"),
      key: "status",
      render: (document) => <StatusBadge status={document.status} />,
    },
    {
      header: t("KNOWLEDGE.TABLE_CHUNKS"),
      key: "chunks",
      render: (document) => document.chunk_count ?? "-",
    },
    {
      header: t("KNOWLEDGE.TABLE_DATE"),
      key: "created",
      render: (document) =>
        new Date(document.created_at).toLocaleDateString(),
    },
    {
      header: t("KNOWLEDGE.TABLE_ACTIONS"),
      key: "actions",
      render: (document) => (
        <DocumentActions
          document={document}
          isRetrying={
            isRetrying && retryingDocumentId === document.id
          }
          onDelete={onDelete}
          onRetry={onRetry}
          onView={onView}
        />
      ),
    },
  ];

  return (
    <Table
      caption={t("KNOWLEDGE.TABLE_CAPTION")}
      columns={columns}
      emptyMessage={t("KNOWLEDGE.EMPTY_STATE_DESC")}
      getRowKey={(document) => document.id}
      renderMobileRow={(document) => (
        <article
          aria-label={document.title}
          className="rounded-ui-control border border-ui-divider bg-ui-raised p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <strong className="text-ui-ink">{document.title}</strong>
            <StatusBadge status={document.status} />
          </div>
          <p className="mt-2 text-sm text-ui-ink-secondary">
            {document.chunk_count ?? 0} {t("KNOWLEDGE.CHUNKS_SHORT")}
          </p>
          <div className="mt-3">
            <DocumentActions
              document={document}
              isRetrying={
                isRetrying && retryingDocumentId === document.id
              }
              onDelete={onDelete}
              onRetry={onRetry}
              onView={onView}
            />
          </div>
        </article>
      )}
      rows={documents}
    />
  );
}
