import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useDefaultAgent } from "../../agents/hooks/use-agents";
import { ChatExperience } from "../ui/ChatExperience";

export function ChatPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const defaultAgentQuery = useDefaultAgent(workspaceId);

  if (!workspaceId) {
    return <ErrorState announce={false} message="Select a workspace to start chatting." title="Workspace required" />;
  }
  if (defaultAgentQuery.isPending) {
    return <div className="mx-auto max-w-7xl rounded-ui-panel border border-ui-line bg-ui-surface p-8"><Skeleton label="Loading default agent" lines={7} /></div>;
  }
  if (defaultAgentQuery.isError) {
    return (
      <ErrorState
        message={defaultAgentQuery.error instanceof Error ? defaultAgentQuery.error.message : "Unable to load the workspace assistant."}
        onRetry={() => void defaultAgentQuery.refetch()}
        title="Default agent unavailable"
      />
    );
  }
  if (!defaultAgentQuery.data) {
    return <ErrorState message="This workspace does not have a default agent." title="Default agent missing" />;
  }
  return (
    <ChatExperience
      agent={defaultAgentQuery.data}
      agentId={defaultAgentQuery.data.id}
      ariaLabel="Workspace conversation"
      workspaceId={workspaceId}
    />
  );
}
