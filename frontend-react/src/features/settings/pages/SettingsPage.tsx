import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import { Tabs } from "../../../shared/ui/Tabs";
import { useWorkspaceSettings } from "../hooks/use-workspace-settings";
import { WorkspaceGeneralPanel } from "../ui/WorkspaceGeneralPanel";
import { WorkspaceMembersPanel } from "../ui/WorkspaceMembersPanel";
import type { Workspace } from "../types/workspace";

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const currentUserUid = useAuthStore(
    (state) => state.user?.firebase_uid ?? "",
  );
  const actions = useWorkspaceSettings(workspaceId);
  const workspaces =
    queryClient.getQueryData<Workspace[]>(queryKeys.workspaces) ?? [];
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? null;
  const createMode = searchParams.get("mode") === "create";
  const activeTab =
    searchParams.get("tab") === "members" ? "members" : "general";
  const membersError =
    actions.members.error instanceof Error
      ? actions.members.error.message
      : undefined;
  const invitationsError =
    actions.invitations.error instanceof Error
      ? actions.invitations.error.message
      : undefined;
  const inviteError =
    actions.invite.error instanceof Error
      ? actions.invite.error.message
      : undefined;
  const memberActionError =
    actions.updateMember.error instanceof Error
      ? actions.updateMember.error.message
      : actions.removeMember.error instanceof Error
        ? actions.removeMember.error.message
        : undefined;

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "general") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <section
      aria-labelledby="settings-title"
      className="mx-auto w-full max-w-6xl"
    >
      <p className="text-metadata">FLAE workspace</p>
      <h1
        className="mt-2 text-[1.75rem] font-bold text-ui-ink"
        id="settings-title"
      >
        Workspace settings
      </h1>
      <p className="mt-2 text-ui-ink-secondary">
        Manage workspace details, members, and access.
      </p>
      <div className="mt-6">
        <Tabs
          ariaLabel="Workspace settings sections"
          defaultValue={activeTab}
          items={[
            {
              id: "general",
              label: "General",
              content: (
                <WorkspaceGeneralPanel
                  createMode={createMode}
                  error={
                    (actions.rename.error ?? actions.create.error) instanceof
                    Error
                      ? (actions.rename.error ?? actions.create.error)?.message
                      : undefined
                  }
                  isSaving={
                    actions.rename.isPending || actions.create.isPending
                  }
                  onCancelCreate={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("mode");
                    setSearchParams(next, { replace: true });
                  }}
                  onSave={async (payload) => {
                    if (createMode) {
                      const created = await actions.create.mutateAsync(payload);
                      useWorkspaceStore
                        .getState()
                        .setCurrentWorkspaceId(created.id);
                    } else {
                      await actions.rename.mutateAsync(payload);
                    }
                  }}
                  workspace={workspace}
                />
              ),
            },
            {
              id: "members",
              label: "Members",
              content: (
                <WorkspaceMembersPanel
                  actionError={memberActionError}
                  currentUserUid={currentUserUid}
                  invitations={actions.invitations.data ?? []}
                  invitationsError={invitationsError}
                  inviteError={inviteError}
                  isInvitationsLoading={actions.invitations.isPending}
                  isInviting={actions.invite.isPending}
                  isLoading={actions.members.isPending}
                  members={actions.members.data ?? []}
                  membersError={membersError}
                  onInvite={(payload) =>
                    actions.invite.mutateAsync(payload).then(() => undefined)
                  }
                  onRemove={(userUid) =>
                    actions.removeMember
                      .mutateAsync(userUid)
                      .then(() => undefined)
                  }
                  onRetryInvitations={() => {
                    void actions.invitations.refetch();
                  }}
                  onRetryMembers={() => {
                    void actions.members.refetch();
                  }}
                  onUpdate={(userUid, role, status) =>
                    actions.updateMember
                      .mutateAsync({ payload: { role, status }, userUid })
                      .then(() => undefined)
                  }
                />
              ),
            },
          ]}
          onValueChange={setTab}
        />
      </div>
    </section>
  );
}
