import { GitMerge, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { PageToolbar } from "../../../shared/ui/PageToolbar";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useTopicActions, useTopics } from "../hooks/use-topics";
import type { Topic, TopicStatus } from "../types/topic";
import { TopicCard } from "../ui/TopicCard";
import { TopicMergeDialog } from "../ui/TopicMergeDialog";

const PAGE_SIZE = 12;
const EMPTY_TOPICS: readonly Topic[] = [];

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return fallback;
  return error instanceof Error ? error.message : fallback;
}

function isGloballyAnnouncedServerError(error: unknown) {
  return error instanceof AppError
    && error.kind === "server"
    && (error.status ?? 0) >= 500;
}

export function TopicListPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TopicStatus>("all");
  const [page, setPage] = useState(0);
  const [mergeOpen, setMergeOpen] = useState(false);
  const topicsQuery = useTopics(workspaceId, {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    query,
    status,
  });
  const topics = topicsQuery.data ?? EMPTY_TOPICS;
  const actions = useTopicActions(workspaceId, null);

  if (!workspaceId) {
    return (
      <section className="surface-panel mx-auto max-w-4xl p-6">
        <PageHeader
          description={t("TOPICS.WORKSPACE_REQUIRED")}
          eyebrow={t("TOPICS.EYEBROW")}
          title={t("TOPICS.TITLE")}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="topics-title" className="mx-auto w-full max-w-7xl">
      <PageHeader
        actions={(
          <Button
            disabled={topics.length < 2 || actions.merge.isPending}
            onClick={() => setMergeOpen(true)}
            variant="secondary"
          >
            <GitMerge aria-hidden className="h-4 w-4" />
            {t("TOPICS.MERGE_BTN")}
          </Button>
        )}
        description={t("TOPICS.DESC")}
        eyebrow={t("TOPICS.EYEBROW")}
        title={t("TOPICS.TITLE")}
        titleId="topics-title"
      />

      <PageToolbar ariaLabel={t("TOPICS.FILTERS_ARIA")} className="mt-6">
        <div className="relative min-w-[min(100%,18rem)] flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ui-ink-muted" />
          <label className="sr-only" htmlFor="topic-search">
            {t("TOPICS.SEARCH_LABEL")}
          </label>
          <input
            className="min-h-11 w-full rounded-ui-control border border-ui-line bg-ui-raised pl-10 pr-3 text-ui-ink placeholder:text-ui-ink-muted"
            id="topic-search"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={t("TOPICS.SEARCH_PLACEHOLDER")}
            type="search"
            value={query}
          />
        </div>
        <Select
          className="min-w-52"
          label={t("TOPICS.STATUS_FILTER")}
          onChange={(event) => {
            setStatus(event.target.value as "all" | TopicStatus);
            setPage(0);
          }}
          options={[
            { label: t("TOPICS.ALL_STATUSES"), value: "all" },
            { label: t("TOPICS.STATUS_ACTIVE"), value: "active" },
            { label: t("TOPICS.STATUS_NEEDS_REVIEW"), value: "needs_review" },
            { label: t("TOPICS.STATUS_ARCHIVED"), value: "archived" },
          ]}
          value={status}
        />
      </PageToolbar>

      <div className="mt-6">
        {topicsQuery.isError ? (
          <ErrorState
            announce={!isGloballyAnnouncedServerError(topicsQuery.error)}
            message={publicErrorMessage(topicsQuery.error, t("TOPICS.FETCH_ERROR"))}
            onRetry={() => void topicsQuery.refetch()}
            retryLabel={t("TOPICS.RETRY_LIST")}
            title={t("TOPICS.FETCH_ERROR")}
          />
        ) : topicsQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="surface-panel p-5" key={index}>
                <Skeleton label={t("COMMON.LOADING")} lines={4} />
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <h2 className="text-lg font-semibold text-ui-ink">
              {t("TOPICS.NO_TOPICS_FOUND")}
            </h2>
            <p className="mt-2 text-ui-ink-secondary">
              {t("TOPICS.FILTER_EMPTY_DESCRIPTION")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => <TopicCard key={topic.topic_id} topic={topic} />)}
          </div>
        )}
      </div>

      {!topicsQuery.isError && (topics.length > 0 || page > 0) ? (
        <nav aria-label={t("TOPICS.TITLE")} className="mt-6 flex items-center justify-between gap-4">
          <Button
            disabled={page === 0 || topicsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            variant="secondary"
          >
            {t("TOPICS.PREVIOUS_PAGE")}
          </Button>
          <span className="text-sm font-semibold text-ui-ink-secondary">
            {t("TOPICS.PAGE_NUMBER", { page: page + 1 })}
          </span>
          <Button
            disabled={topics.length < PAGE_SIZE || topicsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            variant="secondary"
          >
            {t("TOPICS.NEXT_PAGE")}
          </Button>
        </nav>
      ) : null}

      <TopicMergeDialog
        isSubmitting={actions.merge.isPending}
        onClose={() => setMergeOpen(false)}
        onSubmit={(payload) => actions.merge.mutateAsync(payload)}
        open={mergeOpen}
        topics={topics}
      />
    </section>
  );
}
