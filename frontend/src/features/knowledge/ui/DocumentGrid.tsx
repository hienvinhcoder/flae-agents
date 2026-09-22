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
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-primary-soft text-primary">
        <FileSignature className="h-5 w-5" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ui-control bg-muted text-muted-foreground">
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
            className="flex min-h-[210px] animate-pulse flex-col justify-between rounded-ui-panel border border-border bg-card p-5 motion-reduce:animate-none"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-ui-control bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-ui-panel border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
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
            className="group flex min-h-[210px] flex-col justify-between rounded-ui-panel border border-border bg-card p-5 transition-colors duration-150 hover:bg-muted motion-reduce:transition-none"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {getFileIcon(document)}
                  <div className="min-w-0">
                    <strong className="block truncate text-base font-semibold text-foreground">
                      {document.title}
                    </strong>
                    <span className="mt-0.5 block font-code text-[11px] uppercase tracking-wider text-muted-foreground">
                      {document.document_type === "manual_input"
                        ? t("KNOWLEDGE.MANUAL_TEXT")
                        : document.document_type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <StatusBadge status={document.status} />
              </div>

              <p className="mt-3 line-clamp-2 h-10 overflow-hidden text-sm leading-relaxed text-muted-foreground">
                {document.description ||
                  document.file_name ||
                  t("KNOWLEDGE.NO_DESCRIPTION")}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <div className="min-w-0 text-left">
                <span className="block font-code text-[11px] text-muted-foreground">
                  {document.chunk_count ?? 0} {t("KNOWLEDGE.CHUNKS_SHORT")}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                  {formattedDate}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {document.status === "failed" ? (
                  <Button
                    aria-label={t("KNOWLEDGE.RETRY_DOCUMENT", { title: document.title })}
                    className="h-9 min-w-9 px-2 transition-colors duration-200 hover:bg-primary-soft hover:text-primary"
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
                  className="h-9 min-w-9 px-2 transition-colors duration-200 hover:bg-primary-soft hover:text-primary"
                  onClick={() => onView(document)}
                  variant="ghost"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  aria-label={t("KNOWLEDGE.DELETE_DOCUMENT", { title: document.title })}
                  className="h-9 min-w-9 px-2 transition-colors duration-200 hover:bg-state-danger-soft hover:text-state-danger"
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
