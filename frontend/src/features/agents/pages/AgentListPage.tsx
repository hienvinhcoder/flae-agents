import { Bot, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Toast } from "../../../shared/ui/Toast";
import { useAgentActions, useAgents, useCurrentWorkspaceRole } from "../hooks/use-agents";
import type { AgentDetail } from "../types/agent";
import { AgentCard } from "../ui/AgentCard";

const EMPTY_AGENTS: readonly AgentDetail[] = [];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface ManagedAgentCardProps {
  agent: AgentDetail;
  canManage: boolean;
  onError: (message: string) => void;
  workspaceId: string;
}

function ManagedAgentCard({ agent, canManage, onError, workspaceId }: ManagedAgentCardProps) {
  const actions = useAgentActions(workspaceId, agent.id);

  const handleDelete = async () => {
    if (!window.confirm(`Delete agent "${agent.name}" and its conversation history?`)) return;
    try {
      const deleted = await actions.remove.mutateAsync();
      if (!deleted) onError("The agent could not be deleted.");
    } catch (error) {
      onError(errorMessage(error, "The agent could not be deleted."));
    }
  };

  return <AgentCard agent={agent} canManage={canManage} deleteDisabled={actions.remove.isPending} onDelete={() => void handleDelete()} />;
}

export function AgentListPage() {
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
      <section className="surface-panel mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold text-ui-ink">AI agents</h1>
        <p className="mt-2 text-ui-ink-secondary">Select a workspace before managing agents.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="agents-title" className="mx-auto w-full max-w-7xl">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-metadata">Specialized assistance</p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-ui-ink" id="agents-title">AI agents</h1>
          <p className="mt-2 max-w-2xl text-ui-ink-secondary">
            Build focused assistants that answer with your workspace knowledge and operating context.
          </p>
        </div>
        {canManage ? (
          <Link className="button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border px-4 py-2 font-semibold" to="/dashboard/agents/new">
            <Plus aria-hidden className="h-4 w-4" />
            Create agent
          </Link>
        ) : null}
      </header>

      <div className="mt-7">
        {agentsQuery.isError ? (
          <ErrorState
            announce={false}
            message={errorMessage(agentsQuery.error, "Unable to load agents.")}
            onRetry={() => void agentsQuery.refetch()}
            title="Unable to load agents"
          />
        ) : agentsQuery.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="surface-panel p-5" key={index}><Skeleton label="Loading agent" lines={5} /></div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="surface-panel mx-auto max-w-2xl p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ui-line bg-ui-interactive text-ui-ink-muted">
              <Bot aria-hidden className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-ui-ink">No agents yet</h2>
            <p className="mx-auto mt-2 max-w-md text-ui-ink-secondary">
              Create a specialist with clear instructions, a model, and a workspace-grounded purpose.
            </p>
            {canManage ? (
              <Link className="button-primary mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border px-4 py-2 font-semibold" to="/dashboard/agents/new">
                <Plus aria-hidden className="h-4 w-4" />
                Create agent
              </Link>
            ) : null}
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
      {agentsQuery.isError ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <Toast message={errorMessage(agentsQuery.error, "Unable to load agents.")} tone="error" />
        </div>
      ) : null}
    </section>
  );
}
