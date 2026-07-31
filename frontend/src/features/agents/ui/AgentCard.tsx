import { MessageSquare, PencilLine, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <article className="group flex h-full flex-col justify-between rounded-ui-panel border border-ui-divider bg-ui-raised p-5 transition-colors duration-200 hover:border-ui-line-strong motion-reduce:transition-none">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div
            aria-hidden
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${getAgentAvatarColor(agent.avatar_color)}`}
          >
            <AgentAvatarIcon className="h-6 w-6" icon={agent.avatar_icon} />
          </div>
          {canManage ? (
            <div className="flex items-center gap-1">
              <Link
                aria-label={t("AGENTS_UI.EDIT_AGENT", { name: agent.name })}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui-control text-ui-ink-muted transition-colors hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
                to={`/dashboard/agents/${agent.id}/edit`}
              >
                <PencilLine aria-hidden className="h-4 w-4" />
              </Link>
              <button
                aria-label={t("AGENTS_UI.DELETE_AGENT", { name: agent.name })}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui-control text-ui-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger motion-reduce:transition-none"
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
          {t("AGENTS_UI.MODEL_STATUS", { model: agent.model_name })}
        </p>
        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-ui-ink-secondary">
          {agent.system_prompt}
        </p>
      </div>

      <Link
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control border border-state-info bg-state-info-soft px-4 py-2 font-semibold text-state-info transition-colors hover:bg-ui-interactive motion-reduce:transition-none"
        to={`/dashboard/agents/${agent.id}/chat`}
      >
        <MessageSquare aria-hidden className="h-4 w-4" />
        {t("AGENTS_UI.START_CONVERSATION")}
        <span className="sr-only">{t("AGENTS_UI.CHAT_WITH", { name: agent.name })}</span>
      </Link>
    </article>
  );
}
