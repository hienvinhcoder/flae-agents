import { BarChart2, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
} from "../types/knowledge";

type IngestionDocument = KnowledgeDocument | KnowledgeDocumentDetail;

export function IngestionProgress({ document }: { document: IngestionDocument }) {
  const { t } = useTranslation();
  const active =
    document.status === "pending" || document.status === "processing";
  const processingTime =
    "processing_time_seconds" in document
      ? document.processing_time_seconds
      : null;

  const metrics = [
    {
      label: t("KNOWLEDGE.DETAIL_METRIC_CHUNKS"),
      value: document.chunk_count ?? 0,
    },
    {
      label: t("KNOWLEDGE.DETAIL_METRIC_ENTITIES"),
      value: document.entity_count ?? 0,
    },
    {
      label: t("KNOWLEDGE.DETAIL_METRIC_RELATIONS"),
      value: document.relation_count ?? 0,
    },
  ] as const;

  return (
    <section
      aria-labelledby="ingestion-metrics-title"
      className="rounded-lg border border-border bg-secondary/30 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        {active ? (
          <LoaderCircle
            aria-hidden
            className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        ) : (
          <BarChart2 aria-hidden className="h-4 w-4 text-muted-foreground" />
        )}
        <h3
          className="text-[13px] font-medium text-foreground"
          id="ingestion-metrics-title"
        >
          {t("KNOWLEDGE.DETAIL_METRICS")}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div className="flex flex-col gap-1" key={metric.label}>
            <span className="text-[20px] font-semibold tracking-tight text-foreground">
              {metric.value}
            </span>
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              {metric.label}
            </span>
          </div>
        ))}
      </div>
      {processingTime !== null ? (
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[12px] text-muted-foreground">
          <span>{t("KNOWLEDGE.DETAIL_PROCESSED_LABEL")}</span>
          <span className="font-mono">
            {t("KNOWLEDGE.PROCESSING_TIME", { seconds: processingTime })}
          </span>
        </div>
      ) : null}
    </section>
  );
}
