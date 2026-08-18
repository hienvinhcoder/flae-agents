import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../core/stores/workspace-store";
import { useAgentDetail } from "../../features/agents/hooks/use-agents";
import { ChatExperience } from "../../features/chat/ui/ChatExperience";

export function AgentChatPage() {
  const { t } = useTranslation();
  const { agentId } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const detailQuery = useAgentDetail(workspaceId, agentId ?? null);

  useEffect(() => {
    if (!workspaceId || !agentId) void navigate("/dashboard/agents", { replace: true });
  }, [agentId, navigate, workspaceId]);
  useEffect(() => {
    if (detailQuery.isError) void navigate("/dashboard/agents", { replace: true });
  }, [detailQuery.isError, navigate]);

  if (!workspaceId || !agentId || detailQuery.isError) return null;
  return (
    <ChatExperience
      agent={detailQuery.data}
      agentId={agentId}
      agentLoading={detailQuery.isPending}
      ariaLabel={t("CHAT_UI.MESSAGE_AGENT", { name: detailQuery.data?.name ?? t("AGENTS_UI.TITLE") })}
      backHref="/dashboard/agents"
      backLabel={t("CHAT_UI.BACK_TO_AGENTS")}
      workspaceId={workspaceId}
    />
  );
}
