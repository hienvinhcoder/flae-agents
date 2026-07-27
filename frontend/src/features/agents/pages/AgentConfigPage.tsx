import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useCurrentWorkspaceRole } from "../hooks/use-agents";
import { AgentConfigForm } from "./AgentConfigForm";

export function AgentConfigPage() {
  const { t } = useTranslation();
  const { agentId } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const userUid = useAuthStore((state) => state.user?.firebase_uid ?? null);
  const roleQuery = useCurrentWorkspaceRole(workspaceId, userUid);
  const authorized = roleQuery.data === "owner" || roleQuery.data === "admin";

  useEffect(() => {
    if (!workspaceId || !userUid || roleQuery.isError) {
      void navigate("/dashboard/agents", { replace: true });
      return;
    }
    if (roleQuery.data && !authorized) {
      void navigate("/dashboard/agents", { replace: true });
    }
  }, [authorized, navigate, roleQuery.data, roleQuery.isError, userUid, workspaceId]);

  if (!workspaceId || !userUid || roleQuery.isPending || !authorized) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <Skeleton label={t("AGENT_CONFIG.LOADING")} lines={8} />
      </section>
    );
  }

  const contextKey = `${workspaceId}:${agentId ?? "create"}`;
  return (
    <AgentConfigForm
      agentId={agentId ?? null}
      key={contextKey}
      workspaceId={workspaceId}
    />
  );
}
