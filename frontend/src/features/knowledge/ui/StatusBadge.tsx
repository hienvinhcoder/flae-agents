import { useTranslation } from "react-i18next";

import type { DocumentStatus } from "../types/knowledge";

const labels: Record<DocumentStatus, string> = {
  completed: "KNOWLEDGE.STATUS_COMPLETED",
  failed: "KNOWLEDGE.STATUS_FAILED",
  pending: "KNOWLEDGE.STATUS_PENDING",
  processing: "KNOWLEDGE.STATUS_PROCESSING",
};

const tones: Record<DocumentStatus, string> = {
  completed: "border-state-success bg-state-success-soft text-state-success",
  failed: "border-state-danger bg-state-danger-soft text-state-danger",
  pending: "border-state-warning bg-state-warning-soft text-state-warning",
  processing: "border-state-info bg-state-info-soft text-state-info",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex rounded-ui-status border px-2.5 py-1 text-xs font-semibold ${tones[status]}`}
    >
      {t(labels[status])}
    </span>
  );
}
