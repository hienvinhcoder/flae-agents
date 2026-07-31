import { ArrowUpRight, CalendarClock, FileStack, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { Topic, TopicStatus, TopicType } from "../types/topic";

const statusLabelKeys: Record<TopicStatus, string> = {
  active: "TOPICS.STATUS_ACTIVE",
  archived: "TOPICS.STATUS_ARCHIVED",
  needs_review: "TOPICS.STATUS_NEEDS_REVIEW",
};

const statusTones: Record<TopicStatus, string> = {
  active: "border-state-success bg-state-success-soft text-state-success",
  archived: "border-ui-line bg-ui-canvas text-ui-ink-secondary",
  needs_review: "border-state-warning bg-state-warning-soft text-state-warning",
};

const typeLabelKeys: Record<TopicType, string> = {
  domain: "TOPICS.TYPE_DOMAIN",
  subtopic: "TOPICS.TYPE_SUBTOPIC",
  topic: "TOPICS.TYPE_TOPIC",
};

export function TopicCard({ topic }: { topic: Topic }) {
  const { i18n, t } = useTranslation();
  const updatedDate = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language,
  ).format(new Date(topic.updated_at));

  return (
    <Link
      className="group flex min-h-56 flex-col rounded-ui-panel border border-ui-line bg-ui-raised p-5 shadow-ui-card transition-colors duration-200 motion-reduce:transition-none hover:border-ui-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
      to={`/dashboard/topics/${topic.topic_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-ui-status border border-ui-line px-2.5 py-1 text-xs font-semibold text-ui-ink-secondary">
            {t(typeLabelKeys[topic.type])}
          </span>
          <span
            className={`rounded-ui-status border px-2.5 py-1 text-xs font-semibold ${statusTones[topic.status]}`}
          >
            {t(statusLabelKeys[topic.status])}
          </span>
        </div>
        <ArrowUpRight
          aria-hidden
          className="h-5 w-5 shrink-0 text-ui-ink-muted transition-colors duration-200 motion-reduce:transition-none group-hover:text-brand-text"
        />
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ui-ink">
        {topic.name}
      </h2>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ui-ink-secondary">
        {topic.summary ?? t("TOPICS.CARD_NO_SUMMARY")}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ui-divider pt-4 text-sm text-ui-ink-muted">
        <span className="inline-flex items-center gap-2">
          <FileStack aria-hidden className="h-4 w-4" />
          {t("TOPICS.EVIDENCE_COUNT", { count: topic.evidence_count })}
        </span>
        <span className="inline-flex items-center gap-2">
          <Gauge aria-hidden className="h-4 w-4" />
          {t("TOPICS.CONFIDENCE", {
            value: Math.round(topic.confidence * 100),
          })}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarClock aria-hidden className="h-4 w-4" />
          {t("TOPICS.UPDATED_DATE", { date: updatedDate })}
        </span>
      </div>
    </Link>
  );
}
