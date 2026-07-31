import {
  CheckCircle2,
  CircleAlert,
  Layers3,
  LoaderCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";

interface KnowledgeReadinessProps {
  completed: number;
  failed: number;
  onReviewFailed: () => void;
  processing: number;
  total: number;
  totalChunks: number;
}

interface ReadinessMetricProps {
  icon: typeof CheckCircle2;
  label: string;
  tone: "danger" | "muted" | "success" | "warning";
  value: number;
}

const metricTones: Record<ReadinessMetricProps["tone"], string> = {
  danger: "bg-state-danger-soft text-state-danger",
  muted: "bg-ui-interactive text-ui-ink-secondary",
  success: "bg-state-success-soft text-state-success",
  warning: "bg-state-warning-soft text-state-warning",
};

function ReadinessMetric({
  icon: Icon,
  label,
  tone,
  value,
}: ReadinessMetricProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-t border-ui-divider px-5 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 lg:border-l-0 lg:border-t lg:first:border-t-0 xl:border-l xl:border-t-0 xl:first:border-l-0">
      <span
        aria-hidden
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-ui-control ${metricTones[tone]}`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-ui-ink">
          {value.toLocaleString()}
        </p>
        <p className="text-xs font-semibold leading-4 text-ui-ink-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

export function KnowledgeReadiness({
  completed,
  failed,
  onReviewFailed,
  processing,
  total,
  totalChunks,
}: KnowledgeReadinessProps) {
  const { t } = useTranslation();
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (total === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="knowledge-readiness-title"
      className="overflow-hidden rounded-ui-panel border border-ui-divider bg-ui-raised"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <div className="p-5 sm:p-6">
          <p className="text-metadata">{t("KNOWLEDGE.READINESS_EYEBROW")}</p>
          <h2
            className="mt-2 text-xl font-semibold tracking-[-0.01em] text-ui-ink sm:text-2xl"
            id="knowledge-readiness-title"
          >
            {t("KNOWLEDGE.READINESS_TITLE", { completed, total })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-ink-secondary">
            {t("KNOWLEDGE.READINESS_DESCRIPTION")}
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs font-semibold">
              <span className="text-ui-ink-muted">
                {t("KNOWLEDGE.READINESS_PROGRESS_LABEL")}
              </span>
              <span className="tabular-nums text-ui-ink">{progress}%</span>
            </div>
            <div
              aria-label={t("KNOWLEDGE.READINESS_PROGRESS_LABEL")}
              aria-valuemax={total}
              aria-valuemin={0}
              aria-valuenow={completed}
              className="h-2 overflow-hidden rounded-ui-status bg-ui-interactive"
              role="progressbar"
            >
              <div
                className="h-full rounded-ui-status bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {failed > 0 ? (
            <Button
              className="mt-5"
              onClick={onReviewFailed}
              size="sm"
              variant="outline"
            >
              <CircleAlert aria-hidden className="h-4 w-4 text-state-danger" />
              {t("KNOWLEDGE.REVIEW_FAILED", { count: failed })}
            </Button>
          ) : null}
        </div>

        <div className="grid border-t border-ui-divider bg-ui-panel/60 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:grid-cols-1 xl:grid-cols-2">
          <ReadinessMetric
            icon={CheckCircle2}
            label={t("KNOWLEDGE.STAT_READY")}
            tone="success"
            value={completed}
          />
          <ReadinessMetric
            icon={LoaderCircle}
            label={t("KNOWLEDGE.STAT_PROCESSING")}
            tone="warning"
            value={processing}
          />
          <ReadinessMetric
            icon={CircleAlert}
            label={t("KNOWLEDGE.STAT_FAILED")}
            tone="danger"
            value={failed}
          />
          <ReadinessMetric
            icon={Layers3}
            label={t("KNOWLEDGE.STAT_TOTAL_CHUNKS")}
            tone="muted"
            value={totalChunks}
          />
        </div>
      </div>
    </section>
  );
}
