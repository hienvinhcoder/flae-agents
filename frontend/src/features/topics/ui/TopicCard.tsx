import { ArrowUpRight, FileStack, Gauge } from "lucide-react";
import { Link } from "react-router-dom";

import type { Topic, TopicStatus, TopicType } from "../types/topic";

const statusLabels: Record<TopicStatus, string> = {
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

const statusTones: Record<TopicStatus, string> = {
  active: "border-state-success bg-state-success-soft text-state-success",
  archived: "border-ui-line bg-ui-canvas text-ui-ink-secondary",
  needs_review: "border-state-warning bg-state-warning-soft text-state-warning",
};

const typeLabels: Record<TopicType, string> = {
  domain: "Domain",
  subtopic: "Subtopic",
  topic: "Topic",
};

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Link
      className="group flex min-h-56 flex-col rounded-ui-panel border border-ui-line bg-ui-raised p-5 shadow-ui-card transition-colors duration-200 hover:border-ui-line-strong hover:bg-ui-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      to={`/dashboard/topics/${topic.topic_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-ui-status border border-ui-line px-2.5 py-1 text-xs font-semibold text-ui-ink-secondary">
            {typeLabels[topic.type]}
          </span>
          <span
            className={`rounded-ui-status border px-2.5 py-1 text-xs font-semibold ${statusTones[topic.status]}`}
          >
            {statusLabels[topic.status]}
          </span>
        </div>
        <ArrowUpRight
          aria-hidden
          className="h-5 w-5 shrink-0 text-ui-ink-muted transition-colors duration-200 group-hover:text-brand"
        />
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ui-ink">
        {topic.name}
      </h2>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ui-ink-secondary">
        {topic.summary ?? "No summary is available yet."}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-ui-divider pt-4 text-sm text-ui-ink-muted">
        <span className="inline-flex items-center gap-2">
          <FileStack aria-hidden className="h-4 w-4" />
          {topic.evidence_count} evidence
        </span>
        <span className="inline-flex items-center gap-2">
          <Gauge aria-hidden className="h-4 w-4" />
          {Math.round(topic.confidence * 100)}% confidence
        </span>
      </div>
    </Link>
  );
}
