import { MessageSquare, PencilLine, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import type { AgentDetail } from "../types/agent";
import { AgentAvatarIcon } from "./agent-appearance";
import { getAgentAvatarColor } from "./agent-avatar-color";

interface AgentCardProps {
  agent: AgentDetail;
  canManage: boolean;
  deleteDisabled?: boolean;
  onDelete: (agent: AgentDetail) => void;
}

export function AgentCard({ agent, canManage, deleteDisabled = false, onDelete }: AgentCardProps) {
  return (
    <article className="surface-panel group flex h-full flex-col justify-between p-5 transition duration-200 hover:-translate-y-0.5 hover:border-ui-line-strong hover:shadow-ui-panel">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div
            aria-hidden
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${getAgentAvatarColor(agent.avatar_color)}`}
          >
            <AgentAvatarIcon className="h-6 w-6" icon={agent.avatar_icon} />
          </div>
          {canManage ? (
            <div className="flex items-center gap-1">
              <Link
                aria-label={`Edit ${agent.name}`}
                className="rounded-ui-control p-2 text-ui-ink-muted transition-colors hover:bg-ui-interactive hover:text-ui-ink"
                to={`/dashboard/agents/${agent.id}/edit`}
              >
                <PencilLine aria-hidden className="h-4 w-4" />
              </Link>
              <button
                aria-label={`Delete ${agent.name}`}
                className="rounded-ui-control p-2 text-ui-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger"
                disabled={deleteDisabled}
                onClick={() => onDelete(agent)}
                type="button"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <h2 className="mt-5 text-lg font-bold text-ui-ink">{agent.name}</h2>
        <p className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ui-ink-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-state-success" />
          {agent.model_name}
        </p>
        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-ui-ink-secondary">
          {agent.system_prompt}
        </p>
      </div>

      <Link
        aria-label={`Chat with ${agent.name}`}
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border border-state-info bg-state-info-soft px-4 py-2 font-semibold text-state-info transition-colors hover:bg-ui-interactive"
        to={`/dashboard/agents/${agent.id}/chat`}
      >
        <MessageSquare aria-hidden className="h-4 w-4" />
        Start conversation
      </Link>
    </article>
  );
}
