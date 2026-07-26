import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { ChatExperience } from "../../chat/ui/ChatExperience";
import { useAgentDetail } from "../hooks/use-agents";

export function AgentChatPage() {
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
      ariaLabel="Agent conversation"
      backHref="/dashboard/agents"
      backLabel="AI agents"
      workspaceId={workspaceId}
    />
  );
}
