import { Eye, FileSignature, FileText, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import type { KnowledgeDocument } from "../types/knowledge";
import { StatusBadge } from "./StatusBadge";

interface DocumentGridProps {
  documents: readonly KnowledgeDocument[];
  emptyMessage: string;
  isLoading: boolean;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
  onView: (document: KnowledgeDocument) => void;
  retryingDocumentIds: ReadonlySet<string>;
}

function getFileIcon(document: KnowledgeDocument) {
  const isManual = document.document_type === "manual_input";
  const isPdf = document.file_name?.toLowerCase().endsWith(".pdf");

  if (isManual) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-brand-soft text-brand-text">
        <FileSignature className="h-5 w-5" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-ui-interactive text-ui-ink-secondary">
        <FileText className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-ui-interactive text-ui-ink-secondary">
      <FileText className="h-5 w-5" />
    </div>
  );
}

export function DocumentGrid({
  documents,
  emptyMessage,
  isLoading,
  onDelete,
  onRetry,
  onView,
  retryingDocumentIds,
}: DocumentGridProps) {
  const { i18n, t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-[210px] animate-pulse flex-col justify-between rounded-ui-panel border border-ui-divider bg-ui-raised p-5 motion-reduce:animate-none"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-ui-control bg-ui-interactive" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-ui-interactive" />
                <div className="h-3 w-1/2 rounded bg-ui-interactive" />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-3 w-full rounded bg-ui-interactive" />
              <div className="h-3 w-5/6 rounded bg-ui-interactive" />
            </div>
            <div className="border-t border-ui-divider/50 mt-4 pt-3 flex justify-between items-center">
              <div className="h-3 w-20 rounded bg-ui-interactive" />
              <div className="h-8 w-24 rounded bg-ui-interactive" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-ui-panel border border-ui-divider bg-ui-raised p-12 text-center">
        <p className="text-ui-ink-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((document) => {
        const isRetrying = retryingDocumentIds.has(document.id);
        const formattedDate = new Intl.DateTimeFormat(
          i18n.resolvedLanguage ?? i18n.language,
        ).format(new Date(document.created_at));

        return (
          <article
            key={document.id}
            aria-label={document.title}
            className="group flex min-h-[210px] flex-col justify-between rounded-ui-panel border border-ui-divider bg-ui-raised p-5 transition-colors duration-150 hover:bg-ui-panel motion-reduce:transition-none"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {getFileIcon(document)}
                  <div className="min-w-0">
                    <strong className="block truncate text-base font-semibold text-ui-ink">
                      {document.title}
                    </strong>
                    <span className="block font-code text-[11px] uppercase tracking-wider text-ui-ink-muted/80 mt-0.5">
                      {document.document_type === "manual_input"
                        ? t("KNOWLEDGE.MANUAL_TEXT")
                        : document.document_type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <StatusBadge status={document.status} />
              </div>

              <p className="mt-3 text-sm text-ui-ink-secondary line-clamp-2 h-10 overflow-hidden leading-relaxed">
                {document.description ||
                  document.file_name ||
                  t("KNOWLEDGE.NO_DESCRIPTION")}
              </p>
            </div>

            <div className="border-t border-ui-divider/60 mt-4 pt-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <span className="block font-code text-[11px] text-ui-ink-muted/80">
                  {document.chunk_count ?? 0} {t("KNOWLEDGE.CHUNKS_SHORT")}
                </span>
                <span className="block text-[11px] text-ui-ink-disabled mt-0.5">
                  {formattedDate}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {document.status === "failed" ? (
                  <Button
                    aria-label={t("KNOWLEDGE.RETRY_DOCUMENT", { title: document.title })}
                    className="min-w-9 h-9 px-2 hover:bg-brand-soft hover:text-brand-text transition-all duration-200 active:scale-95"
                    isLoading={isRetrying}
                    loadingText={t("KNOWLEDGE.STATUS_PROCESSING")}
                    onClick={() => onRetry(document)}
                    variant="ghost"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  aria-label={t("KNOWLEDGE.OPEN_DOCUMENT", { title: document.title })}
                  className="min-w-9 h-9 px-2 hover:bg-brand-soft hover:text-brand-text transition-all duration-200 active:scale-95"
                  onClick={() => onView(document)}
                  variant="ghost"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  aria-label={t("KNOWLEDGE.DELETE_DOCUMENT", { title: document.title })}
                  className="min-w-9 h-9 px-2 hover:bg-state-danger-soft hover:text-state-danger transition-all duration-200 active:scale-95"
                  onClick={() => onDelete(document)}
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
