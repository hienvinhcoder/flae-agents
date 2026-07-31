import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { TabItem } from "../../../shared/ui/Tabs";
import { useTopicActions, useTopicDetail } from "../hooks/use-topics";
import type { TopicDetail, TopicMember } from "../types/topic";
import { TopicDetailWorkbench } from "../ui/TopicDetailWorkbench";
import {
  isGloballyAnnouncedTopicError,
  publicTopicErrorMessage,
} from "../ui/topic-detail-errors";

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
          <li
            className="rounded-ui-control border border-ui-line bg-ui-canvas p-4"
            key={`${member.member_type}-${member.member_id}`}
          >
            {member.member_type === "document" ? (
              <Link
                className="block transition-colors hover:text-brand-text"
                to="/dashboard/knowledge"
              >
                {content}
              </Link>
            ) : content}
          </li>
        );
      })}
    </ul>
  );
}

interface TopicActionsControllerProps {
  onStableId: (topicId: string) => void;
  routeId: string | null;
  tabItems: readonly TabItem[];
  topic: TopicDetail;
  workspaceId: string;
}

function TopicActionsController({
  onStableId,
  routeId,
  tabItems,
  topic,
  workspaceId,
}: TopicActionsControllerProps) {
  const actions = useTopicActions(workspaceId, topic.topic_id, routeId);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  return (
    <TopicDetailWorkbench
      onRequestSummary={() => actions.reSummarize.mutateAsync()}
      onStableId={(stableTopicId) => {
        if (activeRef.current) {
          onStableId(stableTopicId);
        }
      }}
      onUpdate={(payload) => actions.update.mutateAsync(payload)}
      summaryPending={actions.reSummarize.isPending}
      tabItems={tabItems}
      topic={topic}
      updatePending={actions.update.isPending}
    />
  );
}

export function TopicDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const topicQuery = useTopicDetail(workspaceId, id ?? null);
  const topic = topicQuery.data;

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
        announce={!isGloballyAnnouncedTopicError(topicQuery.error)}
        message={publicTopicErrorMessage(
          topicQuery.error,
          t("TOPICS.FETCH_DETAIL_ERROR"),
        )}
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

  return (
    <section
      aria-labelledby="topic-title"
      className="mx-auto grid w-full max-w-7xl gap-6"
    >
      <Link
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-ui-control font-semibold text-ui-ink-secondary transition-colors duration-200 motion-reduce:transition-none hover:text-ui-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        to="/dashboard/topics"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("TOPICS.BACK_TO_LIST")}
      </Link>

      <TopicActionsController
        key={`${workspaceId}:${topic.topic_id}`}
        onStableId={(stableTopicId) => {
          if (id !== stableTopicId) {
            void navigate(`/dashboard/topics/${stableTopicId}`, { replace: true });
          }
        }}
        routeId={id ?? null}
        tabItems={tabItems}
        topic={topic}
        workspaceId={workspaceId}
      />
    </section>
  );
}
