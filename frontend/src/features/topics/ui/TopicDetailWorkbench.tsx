import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Select } from "../../../shared/ui/Select";
import { Tabs, type TabItem } from "../../../shared/ui/Tabs";
import { topicEditSchema, type TopicEditForm } from "../schemas/topic-schema";
import type {
  TopicDetail,
  TopicStatus,
  TopicType,
  TopicUpdatePayload,
  TopicUpdateResponse,
} from "../types/topic";
import {
  isGloballyAnnouncedTopicError,
  publicTopicErrorMessage,
} from "./topic-detail-errors";

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

type ValidationErrorCode = "nameMax" | "nameRequired" | "reviewDetails";
type SummaryFeedbackKey = "TOPICS.RE_SUMMARY_ERROR" | "TOPICS.RE_SUMMARY_SUCCESS";

interface ActionErrorState {
  error: unknown;
  source: "summary" | "update";
}

interface SummaryFeedbackState {
  key: SummaryFeedbackKey;
  tone: "error" | "success";
}

export interface TopicDetailWorkbenchProps {
  onRequestSummary: () => Promise<boolean>;
  onStableId: (topicId: string) => void;
  onUpdate: (payload: TopicUpdatePayload) => Promise<TopicUpdateResponse>;
  summaryPending: boolean;
  tabItems: readonly TabItem[];
  topic: TopicDetail;
  updatePending: boolean;
}

export function TopicDetailWorkbench({
  onRequestSummary,
  onStableId,
  onUpdate,
  summaryPending,
  tabItems,
  topic,
  updatePending,
}: TopicDetailWorkbenchProps) {
  const { i18n, t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<TopicEditForm>({
    defaultValues: { name: topic.name, status: topic.status },
    resolver: zodResolver(topicEditSchema),
  });
  const [actionError, setActionError] = useState<ActionErrorState>();
  const [summaryFeedback, setSummaryFeedback] = useState<SummaryFeedbackState>();
  const busy = updatePending || summaryPending;
  const validationError: ValidationErrorCode | undefined = errors.name?.type === "too_big"
    ? "nameMax"
    : errors.name
      ? "nameRequired"
      : errors.status
        ? "reviewDetails"
        : undefined;
  const validationMessage = validationError === "nameMax"
    ? t("TOPICS.NAME_MAX")
    : validationError === "nameRequired"
      ? t("TOPICS.NAME_REQUIRED")
      : validationError === "reviewDetails"
        ? t("TOPICS.REVIEW_DETAILS")
        : undefined;
  const updateError = actionError?.source === "update"
    ? publicTopicErrorMessage(actionError.error, t("TOPICS.SAVE_ERROR"))
    : undefined;
  const summaryError = actionError?.source === "summary"
    ? publicTopicErrorMessage(actionError.error, t("TOPICS.RE_SUMMARY_ERROR"))
    : undefined;
  const updatedDate = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language,
  ).format(new Date(topic.updated_at));

  const save = async (payload: TopicEditForm) => {
    setActionError(undefined);
    try {
      const updated = await onUpdate(payload);
      setEditing(false);
      onStableId(updated.topic_id);
    } catch (error) {
      setActionError({ error, source: "update" });
    }
  };

  const requestSummary = async () => {
    setActionError(undefined);
    setSummaryFeedback(undefined);
    try {
      const requested = await onRequestSummary();
      setSummaryFeedback(
        requested
          ? { key: "TOPICS.RE_SUMMARY_SUCCESS", tone: "success" }
          : { key: "TOPICS.RE_SUMMARY_ERROR", tone: "error" },
      );
    } catch (error) {
      setActionError({ error, source: "summary" });
    }
  };

  return (
    <>
      <PageHeader
        actions={(
          <>
            <Button
              aria-label={t("TOPICS.EDIT_TOPIC")}
              disabled={busy || editing}
              onClick={() => {
                setActionError(undefined);
                reset({ name: topic.name, status: topic.status });
                setEditing(true);
              }}
              type="button"
              variant="secondary"
            >
              <Pencil aria-hidden className="h-4 w-4" />
              {t("TOPICS.EDIT")}
            </Button>
            <Button
              disabled={updatePending}
              isLoading={summaryPending}
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
          onSubmit={(event) => void handleSubmit(save)(event)}
        >
          <Input
            disabled={busy}
            error={validationMessage}
            label={t("TOPICS.TOPIC_NAME")}
            {...register("name")}
          />
          <Select
            disabled={busy}
            label={t("TOPICS.TOPIC_STATUS")}
            {...register("status")}
            options={[
              { label: t("TOPICS.STATUS_ACTIVE"), value: "active" },
              { label: t("TOPICS.STATUS_NEEDS_REVIEW"), value: "needs_review" },
              { label: t("TOPICS.STATUS_ARCHIVED"), value: "archived" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={summaryPending}
              isLoading={updatePending}
              loadingText={t("TOPICS.SAVING")}
              type="submit"
            >
              <Save aria-hidden className="h-4 w-4" />
              {t("TOPICS.SAVE_CHANGES")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setActionError(undefined);
                setEditing(false);
                reset({ name: topic.name, status: topic.status });
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
              role={isGloballyAnnouncedTopicError(actionError?.error) ? undefined : "alert"}
            >
              {updateError}
            </p>
          ) : null}
        </form>
      ) : null}

      {summaryError ? (
        <p
          className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-state-danger"
          role={isGloballyAnnouncedTopicError(actionError?.error) ? undefined : "alert"}
        >
          {summaryError}
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
          {t(summaryFeedback.key)}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {topic.current_state ? (
            <section className="surface-panel p-6" aria-labelledby="topic-state-title">
              <h2 className="text-lg font-semibold text-ui-ink" id="topic-state-title">
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
            <h2 className="text-lg font-semibold text-ui-ink" id="topic-evidence-title">
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
    </>
  );
}
