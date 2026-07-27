import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useDefaultAgent } from "../../agents/hooks/use-agents";
import { ChatExperience } from "../ui/ChatExperience";

export function ChatPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const defaultAgentQuery = useDefaultAgent(workspaceId);

  if (!workspaceId) {
    return <ErrorState announce={false} message={t("SHELL.CHAT_WORKSPACE_REQUIRED")} title={t("AGENTS_UI.WORKSPACE_REQUIRED_TITLE")} />;
  }
  if (defaultAgentQuery.isPending) {
    return <div className="mx-auto max-w-7xl border-y border-ui-divider bg-ui-raised/35 p-8"><Skeleton label={t("AGENTS_UI.LOADING_CARD")} lines={7} /></div>;
  }
  if (defaultAgentQuery.isError) {
    const globallyAnnounced = defaultAgentQuery.error instanceof AppError
      && defaultAgentQuery.error.kind === "server"
      && (defaultAgentQuery.error.status ?? 0) >= 500;
    return (
      <ErrorState
        announce={!globallyAnnounced}
        message={defaultAgentQuery.error instanceof AppError
          ? t("CHAT_UI.DEFAULT_AGENT_ERROR")
          : defaultAgentQuery.error instanceof Error
            ? defaultAgentQuery.error.message
            : t("CHAT_UI.DEFAULT_AGENT_ERROR")}
        onRetry={() => void defaultAgentQuery.refetch()}
        retryLabel={t("AGENTS_UI.RETRY")}
        title={t("AGENTS_UI.LOAD_ERROR_TITLE")}
      />
    );
  }
  if (!defaultAgentQuery.data) {
    return <ErrorState message={t("CHAT_UI.DEFAULT_AGENT_ERROR")} title={t("AGENTS_UI.LOAD_ERROR_TITLE")} />;
  }
  return (
    <ChatExperience
      agent={defaultAgentQuery.data}
      agentId={defaultAgentQuery.data.id}
      ariaLabel={t("NAV.CHAT")}
      workspaceId={workspaceId}
    />
  );
}
