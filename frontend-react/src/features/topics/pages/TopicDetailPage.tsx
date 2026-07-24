import { ArrowLeft, FileText, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Input } from "../../../shared/ui/Input";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Tabs, type TabItem } from "../../../shared/ui/Tabs";
import { useTopicActions, useTopicDetail } from "../hooks/use-topics";
import { topicEditSchema } from "../schemas/topic-schema";
import type { TopicMember, TopicStatus } from "../types/topic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load topic details.";
}

function optionalErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

function metadataText(member: TopicMember, key: string) {
  const value = member.metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function EvidenceList({ empty, members }: { empty: string; members: readonly TopicMember[] }) {
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
              {Math.round(member.relevance_score * 100)}% relevance
              {member.evidence_count ? ` - ${member.evidence_count} evidence` : ""}
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

  const tabItems = useMemo<readonly TabItem[]>(() => {
    const members = topic?.members ?? [];
    return [
      {
        content: (
          <EvidenceList
            empty="No evidence excerpts are linked to this topic."
            members={members.filter((member) => member.member_type === "chunk")}
          />
        ),
        id: "evidence",
        label: "Evidence excerpts",
      },
      {
        content: (
          <EvidenceList
            empty="No source documents are linked to this topic."
            members={members.filter((member) => member.member_type === "document")}
          />
        ),
        id: "documents",
        label: "Source documents",
      },
      {
        content: (
          <EvidenceList
            empty="No entities are linked to this topic."
            members={members.filter((member) => member.member_type === "entity")}
          />
        ),
        id: "entities",
        label: "Related entities",
      },
    ];
  }, [topic?.members]);

  const save = async () => {
    const result = topicEditSchema.safeParse({ name, status });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Review the topic details.");
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
          ? { message: "Summary refresh requested.", tone: "success" }
          : {
              message: "Unable to request a summary refresh.",
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
        <h1 className="text-2xl font-bold text-ui-ink">Topic detail</h1>
        <p className="mt-2 text-ui-ink-secondary">
          Select a workspace before opening a knowledge topic.
        </p>
      </section>
    );
  }

  if (topicQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(topicQuery.error)}
        onRetry={() => void topicQuery.refetch()}
        title="Unable to load topic"
      />
    );
  }

  if (topicQuery.isPending || !topic) {
    return (
      <section className="surface-panel mx-auto max-w-5xl p-6">
        <Skeleton label="Loading topic details" lines={7} />
      </section>
    );
  }

  return (
    <section aria-labelledby="topic-title" className="mx-auto w-full max-w-6xl">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-ui-control font-semibold text-ui-ink-secondary transition-colors duration-200 hover:text-ui-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        to="/dashboard/topics"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Back to topics
      </Link>

      <header className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-metadata">{topic.type.replace("_", " ")} topic</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-ink" id="topic-title">
            {topic.name}
          </h1>
          <p className="mt-2 text-sm text-ui-ink-muted">Updated {new Date(topic.updated_at).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy}
            onClick={() => {
              setName(topic.name);
              setStatus(topic.status);
              setValidationError(undefined);
              setEditing(true);
            }}
            variant="secondary"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            Edit
          </Button>
          <Button
            disabled={actions.update.isPending}
            isLoading={actions.reSummarize.isPending}
            loadingText="Requesting summary"
            onClick={() => void requestSummary()}
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Re-summarize
          </Button>
        </div>
      </header>

      {editing ? (
        <div className="surface-panel mt-6 grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
          <Input
            disabled={busy}
            error={validationError}
            label="Topic name"
            onChange={(event) => {
              setName(event.target.value);
              setValidationError(undefined);
            }}
            value={name}
          />
          <Select
            disabled={busy}
            label="Topic status"
            onChange={(event) => setStatus(event.target.value as TopicStatus)}
            options={[
              { label: "Active", value: "active" },
              { label: "Needs review", value: "needs_review" },
              { label: "Archived", value: "archived" },
            ]}
            value={status}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={actions.reSummarize.isPending}
              isLoading={actions.update.isPending}
              loadingText="Saving"
              onClick={() => void save()}
            >
              <Save aria-hidden className="h-4 w-4" />
              Save changes
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setName(topic.name);
                setStatus(topic.status);
                setValidationError(undefined);
              }}
              variant="ghost"
            >
              <X aria-hidden className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {optionalErrorMessage(actions.update.error) || optionalErrorMessage(actions.reSummarize.error) ? (
        <p className="mt-5 rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-state-danger" role="alert">
          {optionalErrorMessage(actions.update.error) ?? optionalErrorMessage(actions.reSummarize.error)}
        </p>
      ) : null}
      {summaryFeedback ? (
        <p
          className={`mt-5 rounded-ui-control border p-3 ${
            summaryFeedback.tone === "success"
              ? "border-state-success bg-state-success-soft text-state-success"
              : "border-state-danger bg-state-danger-soft text-state-danger"
          }`}
          role={summaryFeedback.tone === "success" ? "status" : "alert"}
        >
          {summaryFeedback.message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-5">
          <section className="surface-panel p-6" aria-labelledby="topic-summary-title">
            <h2 className="text-lg font-semibold text-ui-ink" id="topic-summary-title">Summary</h2>
            <p className="mt-3 leading-7 text-ui-ink-secondary">
              {topic.summary ?? "No summary is available yet."}
            </p>
          </section>
          {topic.current_state ? (
            <section className="surface-panel p-6" aria-labelledby="topic-state-title">
              <h2 className="text-lg font-semibold text-ui-ink" id="topic-state-title">Current state</h2>
              <p className="mt-3 leading-7 text-ui-ink-secondary">{topic.current_state}</p>
            </section>
          ) : null}
          <section className="surface-panel p-6" aria-labelledby="topic-evidence-title">
            <h2 className="text-lg font-semibold text-ui-ink" id="topic-evidence-title">Linked knowledge</h2>
            <div className="mt-4">
              <Tabs ariaLabel="Topic evidence" items={tabItems} />
            </div>
          </section>
        </div>

        <aside className="surface-panel h-fit p-5" aria-label="Topic metadata">
          <div className="flex items-center gap-2 text-ui-ink">
            <FileText aria-hidden className="h-5 w-5 text-accent-ai" />
            <h2 className="font-semibold">Topic signals</h2>
          </div>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="text-ui-ink-muted">Status</dt>
              <dd className="mt-1 font-semibold capitalize text-ui-ink">{topic.status.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-ui-ink-muted">Confidence</dt>
              <dd className="mt-1 font-semibold text-ui-ink">{Math.round(topic.confidence * 100)}%</dd>
            </div>
            <div>
              <dt className="text-ui-ink-muted">Linked members</dt>
              <dd className="mt-1 font-semibold text-ui-ink">{topic.members.length}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
