import { GitMerge, Search } from "lucide-react";
import { useState } from "react";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useTopicActions, useTopics } from "../hooks/use-topics";
import type { Topic, TopicStatus } from "../types/topic";
import { TopicCard } from "../ui/TopicCard";
import { TopicMergeDialog } from "../ui/TopicMergeDialog";

const PAGE_SIZE = 12;
const EMPTY_TOPICS: readonly Topic[] = [];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load topics.";
}

export function TopicListPage() {
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
        <h1 className="text-2xl font-bold text-ui-ink">Knowledge topics</h1>
        <p className="mt-2 text-ui-ink-secondary">
          Select a workspace before reviewing knowledge topics.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="topics-title" className="mx-auto w-full max-w-7xl">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-metadata">Workspace intelligence</p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-ui-ink" id="topics-title">
            Knowledge topics
          </h1>
          <p className="mt-2 max-w-2xl text-ui-ink-secondary">
            Review semantic clusters, evidence strength, and areas that need attention.
          </p>
        </div>
        <Button
          disabled={topics.length < 2 || actions.merge.isPending}
          onClick={() => setMergeOpen(true)}
          variant="secondary"
        >
          <GitMerge aria-hidden className="h-4 w-4" />
          Merge topics
        </Button>
      </header>

      <div className="surface-panel mt-6 grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ui-ink-muted" />
          <label className="sr-only" htmlFor="topic-search">Search topics</label>
          <input
            className="min-h-11 w-full rounded-ui-control border border-ui-line bg-ui-raised pl-10 pr-3 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong"
            id="topic-search"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search topic names and summaries"
            type="search"
            value={query}
          />
        </div>
        <Select
          label="Topic status"
          onChange={(event) => {
            setStatus(event.target.value as "all" | TopicStatus);
            setPage(0);
          }}
          options={[
            { label: "All statuses", value: "all" },
            { label: "Active", value: "active" },
            { label: "Needs review", value: "needs_review" },
            { label: "Archived", value: "archived" },
          ]}
          value={status}
        />
      </div>

      <div className="mt-6">
        {topicsQuery.isError ? (
          <ErrorState
            message={errorMessage(topicsQuery.error)}
            onRetry={() => void topicsQuery.refetch()}
            title="Unable to load topics"
          />
        ) : topicsQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="surface-panel p-5" key={index}>
                <Skeleton label="Loading topic" lines={4} />
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <h2 className="text-lg font-semibold text-ui-ink">No topics found</h2>
            <p className="mt-2 text-ui-ink-secondary">
              Try another search or wait for more workspace knowledge to be processed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => <TopicCard key={topic.topic_id} topic={topic} />)}
          </div>
        )}
      </div>

      {!topicsQuery.isError && (topics.length > 0 || page > 0) ? (
        <nav aria-label="Topic pages" className="mt-6 flex items-center justify-between gap-4">
          <Button
            disabled={page === 0 || topicsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            variant="secondary"
          >
            Previous page
          </Button>
          <span className="text-sm font-semibold text-ui-ink-secondary">Page {page + 1}</span>
          <Button
            disabled={topics.length < PAGE_SIZE || topicsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            variant="secondary"
          >
            Next page
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
