import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, MailOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import { Button } from "../../../shared/ui/Button";
import type { Workspace } from "../../settings/types/workspace";
import { acceptWorkspaceInvitation } from "../api/invite-api";

export function InviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessing, setProcessing] = useState(false);
  const [acceptedWorkspace, setAcceptedWorkspace] = useState<Workspace | null>(
    null,
  );
  const token = params.get("token");

  useEffect(() => {
    if (!token) void navigate("/dashboard", { replace: true });
  }, [navigate, token]);

  useEffect(() => {
    if (!acceptedWorkspace) return undefined;
    const timer = window.setTimeout(() => {
      void navigate("/dashboard/settings", { replace: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [acceptedWorkspace, navigate]);

  const accept = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const workspace = await acceptWorkspaceInvitation({ token });
      queryClient.setQueryData<Workspace[]>(
        queryKeys.workspaces,
        (current = []) =>
          current.some((item) => item.id === workspace.id)
            ? current
            : [workspace, ...current],
      );
      useWorkspaceStore.getState().setCurrentWorkspaceId(workspace.id);
      setAcceptedWorkspace(workspace);
    } catch {
      void navigate("/dashboard", { replace: true });
    } finally {
      setProcessing(false);
    }
  };

  if (!token) return null;

  return (
    <main
      aria-label="FLAE application"
      className="grid min-h-screen place-items-center bg-ui-canvas p-4"
    >
      <section
        className="surface-panel w-full max-w-lg overflow-hidden p-6 text-center sm:p-8"
        aria-labelledby="invite-title"
      >
        {acceptedWorkspace ? (
          <>
            <CircleCheck
              aria-hidden
              className="mx-auto h-14 w-14 text-state-success"
            />
            <h1
              className="mt-5 text-2xl font-bold text-ui-ink"
              id="invite-title"
            >
              Joined successfully
            </h1>
            <p className="mt-2 text-ui-ink-secondary">
              Welcome to {acceptedWorkspace.name}. Redirecting to workspace
              settings.
            </p>
          </>
        ) : (
          <>
            <MailOpen aria-hidden className="mx-auto h-14 w-14 text-brand-text" />
            <h1
              className="mt-5 text-2xl font-bold text-ui-ink"
              id="invite-title"
            >
              Workspace invitation
            </h1>
            <p className="mt-2 text-ui-ink-secondary">
              Accept to join the workspace and collaborate with its team.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                className="flex-1"
                disabled={isProcessing}
                onClick={() => {
                  if (window.confirm("Decline this workspace invitation?"))
                    void navigate("/dashboard", { replace: true });
                }}
                variant="secondary"
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                isLoading={isProcessing}
                loadingText="Accepting invitation"
                onClick={() => void accept()}
              >
                Accept invitation
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
