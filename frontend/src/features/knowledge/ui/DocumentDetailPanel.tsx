import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { KnowledgeDocumentDetail } from "../types/knowledge";
import { IngestionProgress } from "./IngestionProgress";
import { StatusBadge } from "./StatusBadge";

interface DocumentDetailPanelProps {
  document?: KnowledgeDocumentDetail;
  error?: string;
  isDeleting: boolean;
  isLoading: boolean;
  isRetrying: boolean;
  onClose: () => void;
  onDelete: (documentId: string) => void;
  onRetry: (documentId: string) => void;
  open: boolean;
}

export function DocumentDetailPanel({
  document,
  error,
  isDeleting,
  isLoading,
  isRetrying,
  onClose,
  onDelete,
  onRetry,
  open,
}: DocumentDetailPanelProps) {
  const { t } = useTranslation();

  return (
    <Dialog onClose={onClose} open={open} title={document?.title ?? "Document details"}>
      {isLoading ? <Skeleton label="Loading document details" lines={5} /> : null}
      {error ? <ErrorState message={error} title="Unable to load document" /> : null}
      {document ? (
        <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={document.status} />
            <span className="text-sm text-ui-ink-muted">
              {document.file_name || t("KNOWLEDGE.MANUAL_TEXT")}
            </span>
          </div>
          {document.description ? (
            <p className="text-ui-ink-secondary">{document.description}</p>
          ) : null}
          <IngestionProgress document={document} />
          {document.error_message ? (
            <p className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-state-danger" role="alert">
              {document.error_message}
            </p>
          ) : null}
          {document.content_text ? (
            <section aria-labelledby="document-content-title">
              <h3 className="font-semibold text-ui-ink" id="document-content-title">
                Extracted content
              </h3>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-ui-control border border-ui-divider bg-ui-raised p-3 text-sm text-ui-ink-secondary">
                {document.content_text}
              </p>
            </section>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3 border-t border-ui-divider pt-4">
            {document.status === "failed" ? (
              <Button
                isLoading={isRetrying}
                loadingText="Retrying"
                onClick={() => onRetry(document.id)}
                variant="secondary"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                Retry ingestion
              </Button>
            ) : null}
            <Button
              isLoading={isDeleting}
              loadingText="Deleting"
              onClick={() => onDelete(document.id)}
              variant="danger"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              Delete document
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
