import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
} from "../types/knowledge";

type IngestionDocument = KnowledgeDocument | KnowledgeDocumentDetail;

export function IngestionProgress({ document }: { document: IngestionDocument }) {
  const { t } = useTranslation();
  const active = document.status === "pending" || document.status === "processing";
  const processingTime =
    "processing_time_seconds" in document
      ? document.processing_time_seconds
      : null;

  return (
    <section
      aria-labelledby="ingestion-metrics-title"
      className="rounded-ui-control border border-ui-divider bg-ui-raised p-4"
    >
      <div className="flex items-center gap-2">
        {active ? (
          <LoaderCircle
            aria-hidden
            className="h-4 w-4 animate-spin text-state-info motion-reduce:animate-none"
          />
        ) : null}
        <h3 className="font-semibold text-ui-ink" id="ingestion-metrics-title">
          {t("KNOWLEDGE.DETAIL_METRICS")}
        </h3>
      </div>
      <p className="mt-3 text-sm text-ui-ink-secondary">
        {document.chunk_count ?? 0} {t("KNOWLEDGE.CHUNKS_SHORT")},{" "}
        {document.entity_count ?? 0} entities,{" "}
        {document.relation_count ?? 0} relations
      </p>
      {processingTime !== null ? (
        <p className="mt-1 text-sm text-ui-ink-muted">
          {t("KNOWLEDGE.PROCESSING_TIME", { seconds: processingTime })}
        </p>
      ) : null}
    </section>
  );
}
