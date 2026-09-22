import {
  BookOpen,
  Eye,
  FileCode2,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { KnowledgeDocument } from "../types/knowledge";
import { StatusBadge } from "./StatusBadge";

interface DocumentTableProps {
  documents: readonly KnowledgeDocument[];
  emptyMessage: string;
  isLoading: boolean;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
  onView: (document: KnowledgeDocument) => void;
  retryingDocumentIds: ReadonlySet<string>;
}

function DocumentIcon({ type }: { type: KnowledgeDocument["document_type"] }) {
  if (type === "manual_input") {
    return <BookOpen aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (type === "markdown" || type === "text") {
    return <FileCode2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function sourceLabel(document: KnowledgeDocument, manualTextLabel: string) {
  if (document.document_type === "manual_input") return manualTextLabel;
  return document.document_type.toUpperCase();
}

function DocumentActions({
  document,
  isRetrying,
  onDelete,
  onRetry,
  onView,
}: {
  document: KnowledgeDocument;
  isRetrying: boolean;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
  onView: (document: KnowledgeDocument) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {document.status === "failed" ? (
        <Button
          aria-label={t("KNOWLEDGE.RETRY_DOCUMENT", { title: document.title })}
          className="h-8 w-8 min-h-8 min-w-8 p-0"
          isLoading={isRetrying}
          loadingText={t("KNOWLEDGE.STATUS_PROCESSING")}
          onClick={() => onRetry(document)}
          size="icon"
          variant="ghost"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        aria-label={t("KNOWLEDGE.OPEN_DOCUMENT", { title: document.title })}
        className="h-8 w-8 min-h-8 min-w-8 p-0"
        onClick={() => onView(document)}
        size="icon"
        variant="ghost"
      >
        <Eye aria-hidden className="h-4 w-4" />
      </Button>
      <Button
        aria-label={t("KNOWLEDGE.DELETE_DOCUMENT", { title: document.title })}
        className="h-8 w-8 min-h-8 min-w-8 p-0 hover:bg-state-danger-soft hover:text-state-danger"
        onClick={() => onDelete(document)}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DocumentTable({
  documents,
  emptyMessage,
  isLoading,
  onDelete,
  onRetry,
  onView,
  retryingDocumentIds,
}: DocumentTableProps) {
  const { i18n, t } = useTranslation();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton label={t("KNOWLEDGE.LOADING_DOCUMENTS")} lines={5} />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-[13px] text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">{t("KNOWLEDGE.TABLE_CAPTION")}</caption>
          <thead className="border-b border-border bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium" scope="col">
                {t("KNOWLEDGE.TABLE_TITLE")}
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                {t("KNOWLEDGE.TABLE_TYPE")}
              </th>
              <th className="px-4 py-3 font-medium" scope="col">
                {t("KNOWLEDGE.TABLE_STATUS")}
              </th>
              <th className="px-4 py-3 text-right font-medium" scope="col">
                {t("KNOWLEDGE.TABLE_DATE")}
              </th>
              <th className="w-28 px-4 py-3" scope="col">
                <span className="sr-only">{t("KNOWLEDGE.TABLE_ACTIONS")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((document) => (
              <tr
                className="group transition-colors hover:bg-muted"
                key={document.id}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <DocumentIcon type={document.document_type} />
                    <span className="truncate">{document.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {sourceLabel(document, t("KNOWLEDGE.MANUAL_TEXT"))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={document.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-[12px] text-muted-foreground">
                  {new Intl.DateTimeFormat(
                    i18n.resolvedLanguage ?? i18n.language,
                    { month: "short", day: "numeric", year: "numeric" },
                  ).format(new Date(document.created_at))}
                </td>
                <td className="px-4 py-3 text-right">
                  <DocumentActions
                    document={document}
                    isRetrying={retryingDocumentIds.has(document.id)}
                    onDelete={onDelete}
                    onRetry={onRetry}
                    onView={onView}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {documents.map((document) => (
          <article
            aria-label={document.title}
            className="rounded-md border border-border bg-card p-4"
            key={document.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                <DocumentIcon type={document.document_type} />
                <span className="truncate">{document.title}</span>
              </div>
              <StatusBadge status={document.status} />
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {sourceLabel(document, t("KNOWLEDGE.MANUAL_TEXT"))}
            </p>
            <div className="mt-3 opacity-100">
              <DocumentActions
                document={document}
                isRetrying={retryingDocumentIds.has(document.id)}
                onDelete={onDelete}
                onRetry={onRetry}
                onView={onView}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
