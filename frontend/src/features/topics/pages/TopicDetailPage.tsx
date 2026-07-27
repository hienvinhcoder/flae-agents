import { ArrowLeft, FileText, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Input } from "../../../shared/ui/Input";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Tabs, type TabItem } from "../../../shared/ui/Tabs";
import { useTopicActions, useTopicDetail } from "../hooks/use-topics";
import { topicEditSchema } from "../schemas/topic-schema";
import type { TopicMember, TopicStatus, TopicType } from "../types/topic";

const topicStatusLabelKeys: Record<TopicStatus, string> = {
  active: "TOPICS.STATUS_ACTIVE",
  archived: "TOPICS.STATUS_ARCHIVED",
  needs_review: "TOPICS.STATUS_NEEDS_REVIEW",
};

const topicTypeLabelKeys: Record<TopicType, string> = {
  domain: "TOPICS.TYPE_DOMAIN",
  subtopic: "TOPICS.TYPE_SUBTOPIC",
  topic: "TOPICS.TYPE_TOPIC",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function optionalErrorMessage(error: unknown, fallback: string) {
  if (!error) return undefined;
  return error instanceof Error ? error.message : fallback;
}

function metadataText(member: TopicMember, key: string) {
  const value = member.metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function EvidenceList({
  empty,
  evidenceLabel,
  members,
  relevanceLabel,
}: {
  empty: string;
  evidenceLabel: (count: number) => string;
  members: readonly TopicMember[];
  relevanceLabel: (value: number) => string;
}) {
  if (members.length === 0) {
    return <p className="text-ui-ink-muted">{empty}</p>;
  }
  return (
    <ul className="grid gap-3">
      {members.map((member) => {
        const title =
          metadataText(member, "title") ??
          metadataText(member, "name") ??
          metadataText(member, "text") ??
          member.member_id;
        const content = (
          <>
            <p className="font-semibold text-ui-ink">{title}</p>
            <p className="mt-1 text-sm text-ui-ink-muted">
              {relevanceLabel(Math.round(member.relevance_score * 100))}
              {member.evidence_count ? ` - ${evidenceLabel(member.evidence_count)}` : ""}
            </p>
          </>
        );
        return (
          <li className="rounded-ui-control border border-ui-line bg-ui-canvas p-4" key={`${member.member_type}-${member.member_id}`}>
            {member.member_type === "document" ? (
              <Link className="block transition-colors hover:text-brand" to="/dashboard/knowledge">
                {content}
              </Link>
            ) : content}
          </li>
        );
      })}
    </ul>
  );
}

export function TopicDetailPage() {
  const { i18n, t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const topicQuery = useTopicDetail(workspaceId, id ?? null);
  const topic = topicQuery.data;
  const actions = useTopicActions(
    workspaceId,
    topic?.topic_id ?? null,
    id ?? null,
  );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<TopicStatus>("active");
  const [validationError, setValidationError] = useState<string>();
  const [summaryFeedback, setSummaryFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  }>();
  const busy = actions.update.isPending || actions.reSummarize.isPending;
  const updateError = optionalErrorMessage(
    actions.update.error,
    t("TOPICS.SAVE_ERROR"),
  );
  const reSummarizeError = optionalErrorMessage(
    actions.reSummarize.error,
    t("TOPICS.RE_SUMMARY_ERROR"),
  );

  const tabItems = useMemo<readonly TabItem[]>(() => {
    const members = topic?.members ?? [];
    const evidenceLabel = (count: number) => t("TOPICS.EVIDENCE_COUNT", { count });
    const relevanceLabel = (value: number) => t("TOPICS.MEMBER_RELEVANCE", { value });
    return [
      {
        content: (
          <EvidenceList
            empty={t("TOPICS.NO_CHUNKS")}
            evidenceLabel={evidenceLabel}
            members={members.filter((member) => member.member_type === "chunk")}
            relevanceLabel={relevanceLabel}
          />
        ),
        id: "evidence",
        label: t("TOPICS.TAB_CHUNKS"),
      },
      {
        content: (
          <EvidenceList
            empty={t("TOPICS.NO_DOCS")}
            evidenceLabel={evidenceLabel}
            members={members.filter((member) => member.member_type === "document")}
            relevanceLabel={relevanceLabel}
          />
        ),
        id: "documents",
        label: t("TOPICS.TAB_DOCUMENTS"),
      },
      {
        content: (
          <EvidenceList
            empty={t("TOPICS.NO_ENTITIES")}
            evidenceLabel={evidenceLabel}
            members={members.filter((member) => member.member_type === "entity")}
            relevanceLabel={relevanceLabel}
          />
        ),
        id: "entities",
        label: t("TOPICS.TAB_ENTITIES"),
      },
    ];
  }, [t, topic?.members]);

  const save = async () => {
    const result = topicEditSchema.safeParse({ name, status });
    if (!result.success) {
      const issue = result.error.issues[0];
      setValidationError(
        issue?.code === "too_big"
          ? t("TOPICS.NAME_MAX")
          : issue?.code === "too_small"
            ? t("TOPICS.NAME_REQUIRED")
            : t("TOPICS.REVIEW_DETAILS"),
      );
      return;
    }
    setValidationError(undefined);
    try {
      const updated = await actions.update.mutateAsync(result.data);
      setEditing(false);
      if (id !== updated.topic_id) {
        void navigate(`/dashboard/topics/${updated.topic_id}`, { replace: true });
      }
    } catch {
      /* Mutation state renders the recoverable error. */
    }
  };

  const requestSummary = async () => {
    setSummaryFeedback(undefined);
    try {
      const requested = await actions.reSummarize.mutateAsync();
      setSummaryFeedback(
        requested
          ? { message: t("TOPICS.RE_SUMMARY_SUCCESS"), tone: "success" }
          : {
              message: t("TOPICS.RE_SUMMARY_ERROR"),
              tone: "error",
            },
      );
    } catch {
      /* Mutation state renders the rejected request. */
    }
  };

  if (!workspaceId) {
    return (
      <section className="surface-panel mx-auto max-w-4xl p-6">
        <PageHeader
          description={t("TOPICS.WORKSPACE_REQUIRED")}
          title={t("TOPICS.DETAIL_TITLE")}
        />
      </section>
    );
  }

  if (topicQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(topicQuery.error, t("TOPICS.FETCH_DETAIL_ERROR"))}
        onRetry={() => void topicQuery.refetch()}
        retryLabel={t("TOPICS.RETRY_LIST")}
        title={t("TOPICS.FETCH_DETAIL_TITLE")}
      />
    );
  }

  if (topicQuery.isPending || !topic) {
    return (
      <section className="surface-panel mx-auto max-w-5xl p-6">
        <Skeleton label={t("TOPICS.LOADING_DETAIL")} lines={7} />
      </section>
    );
  }

  const updatedDate = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language,
  ).format(new Date(topic.updated_at));

  return (
    <section
      aria-labelledby="topic-title"
      className="mx-auto grid w-full max-w-7xl gap-6"
    >
      <Link
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-ui-control font-semibold text-ui-ink-secondary transition-colors duration-200 motion-reduce:transition-none hover:text-ui-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        to="/dashboard/topics"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("TOPICS.BACK_TO_LIST")}
      </Link>

      <PageHeader
        actions={(
          <>
            <Button
              aria-label={t("TOPICS.EDIT_TOPIC")}
              disabled={busy}
              onClick={() => {
                actions.update.reset();
                setName(topic.name);
                setStatus(topic.status);
                setValidationError(undefined);
                setEditing(true);
              }}
              type="button"
              variant="secondary"
            >
              <Pencil aria-hidden className="h-4 w-4" />
              {t("TOPICS.EDIT")}
            </Button>
            <Button
              disabled={actions.update.isPending}
              isLoading={actions.reSummarize.isPending}
              loadingText={t("TOPICS.REQUESTING_SUMMARY")}
              onClick={() => void requestSummary()}
              type="button"
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              {t("TOPICS.RE_SUMMARY_BTN")}
            </Button>
          </>
        )}
        description={topic.summary || t("TOPICS.NO_SUMMARY")}
        eyebrow={`${t(topicTypeLabelKeys[topic.type])} ${t("TOPICS.TOPIC_LABEL")}`}
        metadata={t("TOPICS.UPDATED_DATE", { date: updatedDate })}
        title={topic.name}
        titleId="topic-title"
      />

      {editing ? (
        <form
          aria-describedby={updateError ? "topic-update-error" : undefined}
          aria-label={t("TOPICS.EDIT_TOPIC")}
          className="surface-panel grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Input
            disabled={busy}
            error={validationError}
            label={t("TOPICS.TOPIC_NAME")}
            onChange={(event) => {
              setName(event.target.value);
              setValidationError(undefined);
            }}
            value={name}
          />
          <Select
            disabled={busy}
            label={t("TOPICS.TOPIC_STATUS")}
            onChange={(event) => setStatus(event.target.value as TopicStatus)}
            options={[
              { label: t("TOPICS.STATUS_ACTIVE"), value: "active" },
              { label: t("TOPICS.STATUS_NEEDS_REVIEW"), value: "needs_review" },
              { label: t("TOPICS.STATUS_ARCHIVED"), value: "archived" },
            ]}
            value={status}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={actions.reSummarize.isPending}
              isLoading={actions.update.isPending}
              loadingText={t("TOPICS.SAVING")}
              type="submit"
            >
              <Save aria-hidden className="h-4 w-4" />
              {t("TOPICS.SAVE_CHANGES")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                actions.update.reset();
                setEditing(false);
                setName(topic.name);
                setStatus(topic.status);
                setValidationError(undefined);
              }}
              type="button"
              variant="ghost"
            >
              <X aria-hidden className="h-4 w-4" />
              {t("TOPICS.CANCEL")}
            </Button>
          </div>
          {updateError ? (
            <p
              className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-state-danger md:col-span-3"
              id="topic-update-error"
              role="alert"
            >
              {updateError}
            </p>
          ) : null}
        </form>
      ) : null}

      {reSummarizeError ? (
        <p
          className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-state-danger"
          role="alert"
        >
          {reSummarizeError}
        </p>
      ) : null}
      {summaryFeedback ? (
        <p
          className={`rounded-ui-control border p-3 ${
            summaryFeedback.tone === "success"
              ? "border-state-success bg-state-success-soft text-state-success"
              : "border-state-danger bg-state-danger-soft text-state-danger"
          }`}
          role={summaryFeedback.tone === "success" ? "status" : "alert"}
        >
          {summaryFeedback.message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {topic.current_state ? (
            <section className="surface-panel p-6" aria-labelledby="topic-state-title">
              <h2
                className="text-lg font-semibold text-ui-ink"
                id="topic-state-title"
              >
                {t("TOPICS.CURRENT_STATE")}
              </h2>
              <p className="mt-3 break-words leading-7 text-ui-ink-secondary">
                {topic.current_state}
              </p>
            </section>
          ) : null}
          <section
            aria-labelledby="topic-evidence-title"
            className={`${topic.current_state ? "mt-6" : ""} border-t border-ui-divider pt-6`}
          >
            <h2
              className="text-lg font-semibold text-ui-ink"
              id="topic-evidence-title"
            >
              {t("TOPICS.KNOWLEDGE_LINKS")}
            </h2>
            <div className="mt-4">
              <Tabs ariaLabel={t("TOPICS.EVIDENCE_TABS_ARIA")} items={tabItems} />
            </div>
          </section>
        </div>

        <aside
          aria-label={t("TOPICS.TOPIC_METADATA")}
          className="surface-panel h-fit p-5"
        >
          <div className="flex items-center gap-2 text-ui-ink">
            <FileText aria-hidden className="h-5 w-5 text-accent-ai" />
            <h2 className="font-semibold">{t("TOPICS.TOPIC_SIGNALS")}</h2>
          </div>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="text-ui-ink-muted">{t("TOPICS.STATUS_LABEL")}</dt>
              <dd className="mt-1 font-semibold text-ui-ink">
                {t(topicStatusLabelKeys[topic.status])}
              </dd>
            </div>
            <div>
              <dt className="text-ui-ink-muted">{t("TOPICS.CONFIDENCE_LABEL")}</dt>
              <dd className="mt-1 font-semibold text-ui-ink">
                {Math.round(topic.confidence * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-ui-ink-muted">{t("TOPICS.LINKED_MEMBERS")}</dt>
              <dd className="mt-1 font-semibold text-ui-ink">{topic.members.length}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
