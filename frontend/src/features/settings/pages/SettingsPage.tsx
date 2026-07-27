import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { AppError } from "../../../core/api/errors";
import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Tabs } from "../../../shared/ui/Tabs";
import { useWorkspaceSettings } from "../hooks/use-workspace-settings";
import { WorkspaceGeneralPanel } from "../ui/WorkspaceGeneralPanel";
import { WorkspaceMembersPanel } from "../ui/WorkspaceMembersPanel";
import type { Workspace } from "../types/workspace";

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return fallback;
  return error instanceof Error ? error.message : fallback;
}

function isGloballyAnnouncedError(error: unknown) {
  return (
    error instanceof AppError &&
    (error.kind === "network" ||
      error.status === 401 ||
      (error.kind === "server" && (error.status ?? 0) >= 500))
  );
}

function errorView(error: unknown, fallback: string) {
  return error
    ? {
        announce: !isGloballyAnnouncedError(error),
        message: publicErrorMessage(error, fallback),
      }
    : { announce: true, message: undefined };
}

export function SettingsPage() {
  const { t } = useTranslation();
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
  const generalError = errorView(
    actions.rename.error ?? actions.create.error,
    t("COMMON.ERROR"),
  );
  const membersError = errorView(
    actions.members.error,
    t("SETTINGS_UI.LOAD_MEMBERS_ERROR"),
  );
  const invitationsError = errorView(
    actions.invitations.error,
    t("SETTINGS_UI.LOAD_INVITATIONS_ERROR"),
  );
  const inviteError = errorView(actions.invite.error, t("COMMON.ERROR"));
  const memberActionError = errorView(
    actions.updateMember.error ?? actions.removeMember.error,
    t("COMMON.ERROR"),
  );

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "general") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <section
      aria-labelledby="settings-title"
      className="mx-auto grid w-full max-w-6xl gap-6"
    >
      <PageHeader
        description={t("SETTINGS_UI.DESCRIPTION")}
        eyebrow={t("SETTINGS_UI.EYEBROW")}
        title={t("SETTINGS_UI.TITLE")}
        titleId="settings-title"
      />
      <div>
        <Tabs
          ariaLabel={t("SETTINGS_UI.SECTIONS_ARIA")}
          defaultValue={activeTab}
          items={[
            {
              id: "general",
              label: t("SETTINGS_UI.GENERAL"),
              content: (
                <WorkspaceGeneralPanel
                  createMode={createMode}
                  announceError={generalError.announce}
                  error={generalError.message}
                  isSaving={
                    actions.rename.isPending || actions.create.isPending
                  }
                  key={workspaceId ?? "no-workspace"}
                  onCancelCreate={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("mode");
                    setSearchParams(next, { replace: true });
                  }}
                  onSave={async (payload) => {
                    if (createMode) {
                      const created = await actions.create.mutateAsync(payload);
                      const workspaceStore = useWorkspaceStore.getState();
                      if (workspaceStore.currentWorkspaceId === workspaceId) {
                        workspaceStore.setCurrentWorkspaceId(created.id);
                      }
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
              label: t("SETTINGS_UI.MEMBERS"),
              content: (
                <WorkspaceMembersPanel
                  actionError={memberActionError.message}
                  announceActionError={memberActionError.announce}
                  announceInvitationsError={invitationsError.announce}
                  announceInviteError={inviteError.announce}
                  announceMembersError={membersError.announce}
                  currentUserUid={currentUserUid}
                  invitations={actions.invitations.data ?? []}
                  invitationsError={invitationsError.message}
                  inviteError={inviteError.message}
                  isInvitationsLoading={actions.invitations.isPending}
                  isInviting={actions.invite.isPending}
                  isLoading={actions.members.isPending}
                  key={workspaceId ?? "no-workspace"}
                  members={actions.members.data ?? []}
                  membersError={membersError.message}
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
