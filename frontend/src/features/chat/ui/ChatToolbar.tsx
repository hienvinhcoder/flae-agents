import { ArrowLeft, PanelLeft, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { AgentDetail } from "../../agents/types/agent";

interface ChatToolbarProps {
  agent?: AgentDetail;
  agentLoading?: boolean;
  backHref?: string;
  backLabel?: string;
  creating: boolean;
  historyOpen: boolean;
  onCreate: () => void;
  onToggleHistory: () => void;
  sessionTitle?: string | null;
}

export function ChatToolbar({
  agent,
  agentLoading,
  backHref,
  backLabel,
  creating,
  historyOpen,
  onCreate,
  onToggleHistory,
  sessionTitle,
}: ChatToolbarProps) {
  const { t } = useTranslation();

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 px-2 sm:px-3">
      <Button
        aria-controls="conversation-history"
        aria-expanded={historyOpen}
        aria-label={historyOpen ? t("CHAT_UI.CLOSE_HISTORY") : t("CHAT_UI.OPEN_HISTORY")}
        className="border-transparent bg-transparent text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink"
        onClick={onToggleHistory}
        pill
        size="icon"
        type="button"
        variant="secondary"
      >
        <PanelLeft aria-hidden className="h-4 w-4" />
      </Button>
      <Button
        aria-label={t("CHAT_UI.NEW_CONVERSATION")}
        isLoading={creating}
        loadingText={t("CHAT_UI.CREATING_CONVERSATION")}
        onClick={onCreate}
        pill
        size="sm"
      >
        <Plus aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">{t("CHAT_UI.NEW_CONVERSATION")}</span>
      </Button>
      <div className="min-w-0 flex-1 px-1 text-center sm:text-left">
        {agentLoading ? (
          <div className="mx-auto max-w-xs sm:mx-0"><Skeleton label={t("AGENTS_UI.LOADING_CARD")} lines={2} /></div>
        ) : agent ? (
          <>
            <h1
              className="truncate text-sm font-semibold text-ui-ink"
              title={t("CHAT_UI.READY_ON_MODEL", { model: agent.model_name })}
            >
              {agent.name}
            </h1>
            {sessionTitle ? (
              <p className="truncate text-xs text-ui-ink-muted">{sessionTitle}</p>
            ) : null}
          </>
        ) : null}
      </div>
      {backHref && backLabel ? (
        <Link
          className="inline-flex shrink-0 items-center gap-1.5 rounded-ui-status px-2 py-1 text-xs font-medium text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink"
          to={backHref}
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      ) : null}
    </header>
  );
}
