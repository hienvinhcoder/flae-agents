import { Eye, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
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

function documentTypeLabel(document: KnowledgeDocument) {
  if (document.document_type === "manual_input") return "Manual text";
  return document.document_type.toUpperCase();
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
  if (isLoading) {
    return (
      <div className="surface-panel p-6">
        <Skeleton label="Loading knowledge documents" lines={5} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-ui-panel border border-ui-line bg-ui-panel">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <caption className="sr-only">Knowledge documents</caption>
        <thead className="bg-ui-raised text-sm text-ui-ink-secondary">
          <tr>
            <th className="px-4 py-3 font-semibold" scope="col">Document</th>
            <th className="px-4 py-3 font-semibold" scope="col">Type</th>
            <th className="px-4 py-3 font-semibold" scope="col">Status</th>
            <th className="px-4 py-3 font-semibold" scope="col">Chunks</th>
            <th className="px-4 py-3 font-semibold" scope="col">Created</th>
            <th className="px-4 py-3 font-semibold" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-divider">
          {documents.length === 0 ? (
            <tr>
              <td className="px-4 py-12 text-center text-ui-ink-muted" colSpan={6}>
                No documents match the current filters.
              </td>
            </tr>
          ) : (
            documents.map((document) => (
              <tr className="hover:bg-ui-interactive" key={document.id}>
                <td className="px-4 py-3">
                  <strong className="block text-ui-ink">{document.title}</strong>
                  <span className="block max-w-xs truncate text-sm text-ui-ink-muted">
                    {document.description || document.file_name || "No description"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ui-ink-secondary">
                  {documentTypeLabel(document)}
                </td>
                <td className="px-4 py-3"><StatusBadge status={document.status} /></td>
                <td className="px-4 py-3 text-ui-ink-secondary">
                  {document.chunk_count ?? "-"}
                </td>
                <td className="px-4 py-3 text-sm text-ui-ink-secondary">
                  {new Date(document.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {document.status === "failed" ? (
                      <Button
                        aria-label={`${isRetrying && retryingDocumentId === document.id ? "Retrying" : "Retry"} ${document.title}`}
                        className="px-3"
                        isLoading={isRetrying && retryingDocumentId === document.id}
                        loadingText="Retrying"
                        onClick={() => onRetry(document)}
                        variant="ghost"
                      >
                        <RotateCcw aria-hidden className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      aria-label={`View ${document.title}`}
                      className="px-3"
                      onClick={() => onView(document)}
                      variant="ghost"
                    >
                      <Eye aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${document.title}`}
                      className="px-3"
                      onClick={() => onDelete(document)}
                      variant="ghost"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
