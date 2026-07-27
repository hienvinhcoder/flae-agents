import { Bot, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useState } from "react";

import { AppError } from "../../../core/api/errors";
import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Toast } from "../../../shared/ui/Toast";
import { useAgentActions, useAgents, useCurrentWorkspaceRole } from "../hooks/use-agents";
import type { AgentDetail } from "../types/agent";
import { AgentCard } from "../ui/AgentCard";

const EMPTY_AGENTS: readonly AgentDetail[] = [];

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return fallback;
  return error instanceof Error ? error.message : fallback;
}

function isGloballyAnnouncedServerError(error: unknown) {
  return error instanceof AppError && error.kind === "server" && (error.status ?? 0) >= 500;
}

interface ManagedAgentCardProps {
  agent: AgentDetail;
  canManage: boolean;
  onError: (message: string) => void;
  workspaceId: string;
}

function ManagedAgentCard({ agent, canManage, onError, workspaceId }: ManagedAgentCardProps) {
  const { t } = useTranslation();
  const actions = useAgentActions(workspaceId, agent.id);

  const handleDelete = async () => {
    if (!window.confirm(t("AGENTS_UI.DELETE_CONFIRM", { name: agent.name }))) return;
    try {
      const deleted = await actions.remove.mutateAsync();
      if (!deleted) onError(t("AGENTS_UI.DELETE_FAILED"));
    } catch (error) {
      onError(publicErrorMessage(error, t("AGENTS_UI.DELETE_FAILED")));
    }
  };

  return <AgentCard agent={agent} canManage={canManage} deleteDisabled={actions.remove.isPending} onDelete={() => void handleDelete()} />;
}

export function AgentListPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const userUid = useAuthStore((state) => state.user?.firebase_uid ?? null);
  const agentsQuery = useAgents(workspaceId);
  const roleQuery = useCurrentWorkspaceRole(workspaceId, userUid);
  const [notification, setNotification] = useState<string | null>(null);
  const agents = agentsQuery.data ?? EMPTY_AGENTS;
  const role = roleQuery.data ?? "member";
  const canManage = role === "owner" || role === "admin";

  if (!workspaceId) {
    return (
      <section className="mx-auto w-full max-w-7xl">
        <PageHeader
          description={t("AGENTS_UI.WORKSPACE_REQUIRED_DESCRIPTION")}
          title={t("AGENTS_UI.WORKSPACE_REQUIRED_TITLE")}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8">
      <PageHeader
        actions={canManage ? (
          <Link className="button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control border px-4 py-2 font-semibold" to="/dashboard/agents/new">
            <Plus aria-hidden className="h-4 w-4" />
            {t("AGENTS_UI.CREATE")}
          </Link>
        ) : undefined}
        description={t("AGENTS_UI.DESCRIPTION")}
        eyebrow={t("AGENTS_UI.EYEBROW")}
        title={t("AGENTS_UI.TITLE")}
      />

      <div>
        {agentsQuery.isError ? (
          <ErrorState
            announce={!isGloballyAnnouncedServerError(agentsQuery.error)}
            message={publicErrorMessage(agentsQuery.error, t("AGENTS_UI.LOAD_ERROR_FALLBACK"))}
            onRetry={() => void agentsQuery.refetch()}
            retryLabel={t("ERROR_PAGE.RETRY")}
            title={t("AGENTS_UI.LOAD_ERROR_TITLE")}
          />
        ) : agentsQuery.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="rounded-ui-panel border border-ui-divider bg-ui-raised p-5" key={index}>
                <Skeleton label={t("AGENTS_UI.LOADING_CARD")} lines={5} />
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="border-y border-ui-divider bg-ui-raised/45">
            <EmptyState
              action={canManage ? (
                <Link className="button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control border px-4 py-2 font-semibold" to="/dashboard/agents/new">
                  <Plus aria-hidden className="h-4 w-4" />
                  {t("AGENTS_UI.CREATE")}
                </Link>
              ) : undefined}
              description={t("AGENTS_UI.EMPTY_DESCRIPTION")}
              icon={Bot}
              title={t("AGENTS_UI.EMPTY_TITLE")}
            />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <ManagedAgentCard agent={agent} canManage={canManage} key={agent.id} onError={setNotification} workspaceId={workspaceId} />
            ))}
          </div>
        )}
      </div>

      {notification ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <Toast message={notification} onDismiss={() => setNotification(null)} tone="error" />
        </div>
      ) : null}
    </section>
  );
}
