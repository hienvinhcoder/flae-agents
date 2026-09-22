import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { DocumentStatus } from "../types/knowledge";

const labels: Record<DocumentStatus, string> = {
  completed: "KNOWLEDGE.STATUS_COMPLETED",
  failed: "KNOWLEDGE.STATUS_FAILED",
  pending: "KNOWLEDGE.STATUS_PENDING",
  processing: "KNOWLEDGE.STATUS_PROCESSING",
};

const tones: Record<DocumentStatus, string> = {
  completed: "bg-state-success-soft text-state-success",
  failed: "bg-state-danger-soft text-state-danger",
  pending: "bg-state-warning-soft text-state-warning",
  processing: "bg-state-warning-soft text-state-warning",
};

const dots: Record<DocumentStatus, string> = {
  completed: "bg-state-success",
  failed: "bg-state-danger",
  pending: "bg-state-warning",
  processing: "bg-state-warning",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${tones[status]}`}
    >
      {status === "processing" ? (
        <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
      ) : (
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      )}
      {t(labels[status])}
    </span>
  );
}
