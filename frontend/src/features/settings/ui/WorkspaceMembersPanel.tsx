import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Table, type TableColumn } from "../../../shared/ui/Table";
import type { InviteMemberForm } from "../schemas/workspace-schema";
import type {
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceMemberStatus,
  WorkspaceRole,
} from "../types/workspace";
import { InviteMemberDialog } from "./InviteMemberDialog";

interface WorkspaceMembersPanelProps {
  actionError?: string;
  announceActionError?: boolean;
  announceInvitationsError?: boolean;
  announceInviteError?: boolean;
  announceMembersError?: boolean;
  currentUserUid: string;
  invitationsError?: string;
  inviteError?: string;
  invitations: readonly WorkspaceInvitation[];
  isInvitationsLoading: boolean;
  isInviting: boolean;
  isLoading: boolean;
  membersError?: string;
  members: readonly WorkspaceMember[];
  onInvite: (payload: InviteMemberForm) => Promise<void>;
  onRemove: (userUid: string) => Promise<void>;
  onRetryInvitations: () => void;
  onRetryMembers: () => void;
  onUpdate: (
    userUid: string,
    role: WorkspaceRole,
    status: WorkspaceMemberStatus,
  ) => Promise<void>;
}

interface MemberControlsProps {
  canManage: boolean;
  fallbackName: string;
  member: WorkspaceMember;
  onRemove: (userUid: string) => Promise<void>;
  onUpdate: (
    userUid: string,
    role: WorkspaceRole,
    status: WorkspaceMemberStatus,
  ) => Promise<void>;
  roles: readonly WorkspaceRole[];
}

function displayName(member: WorkspaceMember, fallbackName: string) {
  return member.full_name?.trim() || member.email || fallbackName;
}

function roleKey(role: WorkspaceRole) {
  return `SETTINGS_UI.ROLE_${role.toUpperCase()}`;
}

function statusKey(status: WorkspaceMemberStatus) {
  return `SETTINGS_UI.STATUS_${status.toUpperCase()}`;
}

function MemberIdentity({
  fallbackName,
  member,
}: {
  fallbackName: string;
  member: WorkspaceMember;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-ui-ink">
        {displayName(member, fallbackName)}
      </p>
      <p className="truncate text-sm text-ui-ink-muted">{member.email}</p>
    </div>
  );
}

function MemberControls({
  canManage,
  fallbackName,
  member,
  onRemove,
  onUpdate,
  roles,
}: MemberControlsProps) {
  const { t } = useTranslation();
  const name = displayName(member, fallbackName);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canManage ? (
        <select
          aria-label={t("SETTINGS_UI.ROLE_FOR", { name })}
          className="min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 text-ui-ink"
          onChange={(event) =>
            void onUpdate(
              member.user_uid,
              event.target.value as WorkspaceRole,
              member.status,
            )
          }
          value={member.role}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {t(roleKey(role))}
            </option>
          ))}
        </select>
      ) : (
        <span className="font-semibold text-ui-ink-secondary">
          {t(roleKey(member.role))}
        </span>
      )}
      {canManage ? (
        <Button
          aria-label={t("SETTINGS_UI.REMOVE_MEMBER", { name })}
          onClick={() => {
            if (window.confirm(t("SETTINGS_UI.REMOVE_CONFIRM", { name }))) {
              void onRemove(member.user_uid);
            }
          }}
          variant="danger"
        >
          {t("SETTINGS_UI.REMOVE")}
        </Button>
      ) : null}
    </div>
  );
}

export function WorkspaceMembersPanel(props: WorkspaceMembersPanelProps) {
  const { i18n, t } = useTranslation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const currentRole = useMemo(
    () =>
      props.members.find((member) => member.user_uid === props.currentUserUid)
        ?.role ?? "member",
    [props.currentUserUid, props.members],
  );
  const canInvite = currentRole === "owner" || currentRole === "admin";
  const canManage = (member: WorkspaceMember) => {
    if (member.user_uid === props.currentUserUid) return false;
    if (currentRole === "owner") return true;
    return (
      currentRole === "admin" &&
      (member.role === "member" || member.role === "viewer")
    );
  };
  const rolesFor = () =>
    currentRole === "owner"
      ? (["admin", "member", "viewer"] as const)
      : (["member", "viewer"] as const);
  const memberFallback = t("SETTINGS_UI.MEMBER");
  const memberColumns: readonly TableColumn<WorkspaceMember>[] = [
    {
      header: t("SETTINGS_UI.MEMBER"),
      key: "member",
      render: (member) => (
        <MemberIdentity fallbackName={memberFallback} member={member} />
      ),
    },
    {
      header: t("SETTINGS_UI.ROLE"),
      key: "role",
      render: (member) => (
        <MemberControls
          canManage={canManage(member)}
          fallbackName={memberFallback}
          member={member}
          onRemove={props.onRemove}
          onUpdate={props.onUpdate}
          roles={rolesFor()}
        />
      ),
    },
    {
      header: t("SETTINGS_UI.STATUS"),
      key: "status",
      render: (member) => t(statusKey(member.status)),
    },
  ];
  const locale = i18n.resolvedLanguage === "vi" ? "vi-VN" : "en-US";

  if (props.isLoading) {
    return (
      <Skeleton label={t("SETTINGS_UI.LOADING_MEMBERS")} lines={4} />
    );
  }
  if (props.membersError) {
    return (
      <ErrorState
        announce={props.announceMembersError}
        message={props.membersError}
        onRetry={props.onRetryMembers}
        retryLabel={t("COMMON.RETRY")}
        title={t("SETTINGS_UI.LOAD_MEMBERS_ERROR")}
      />
    );
  }

  return (
    <div className="grid gap-8">
      <section
        aria-labelledby="members-title"
        className="border-t border-ui-divider pt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold text-ui-ink"
              id="members-title"
            >
              {t("SETTINGS_UI.MEMBERS")}
            </h2>
            <p className="mt-1 text-ui-ink-secondary">
              {t("SETTINGS_UI.MEMBERS_DESCRIPTION")}
            </p>
          </div>
          {canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden className="h-4 w-4" />
              {t("SETTINGS_UI.INVITE_MEMBER")}
            </Button>
          ) : null}
        </div>
        {props.actionError ? (
          <p
            className="mt-4 text-state-danger"
            role={props.announceActionError === false ? undefined : "alert"}
          >
            {props.actionError}
          </p>
        ) : null}
        <div className="mt-5">
          <Table
            caption={t("SETTINGS_UI.MEMBERS")}
            columns={memberColumns}
            emptyMessage={t("SETTINGS_UI.NO_MEMBERS")}
            getRowKey={(member) => member.user_uid}
            renderMobileRow={(member) => (
              <article
                aria-label={displayName(member, memberFallback)}
                className="rounded-ui-control border border-ui-divider bg-ui-raised p-4"
              >
                <MemberIdentity
                  fallbackName={memberFallback}
                  member={member}
                />
                <p className="mt-2 text-sm text-ui-ink-muted">
                  {t(statusKey(member.status))}
                </p>
                <div className="mt-4">
                  <MemberControls
                    canManage={canManage(member)}
                    fallbackName={memberFallback}
                    member={member}
                    onRemove={props.onRemove}
                    onUpdate={props.onUpdate}
                    roles={rolesFor()}
                  />
                </div>
              </article>
            )}
            rows={props.members}
          />
        </div>
      </section>

      <section
        aria-labelledby="invitations-title"
        className="border-t border-ui-divider pt-6"
      >
        <h2
          className="text-xl font-semibold text-ui-ink"
          id="invitations-title"
        >
          {t("SETTINGS_UI.PENDING_INVITATIONS")}
        </h2>
        <div className="mt-4 grid gap-3">
          {props.isInvitationsLoading ? (
            <Skeleton
              label={t("SETTINGS_UI.LOADING_INVITATIONS")}
              lines={2}
            />
          ) : props.invitationsError ? (
            <ErrorState
              announce={props.announceInvitationsError}
              message={props.invitationsError}
              onRetry={props.onRetryInvitations}
              retryLabel={t("SETTINGS_UI.RETRY_INVITATIONS")}
              title={t("SETTINGS_UI.LOAD_INVITATIONS_ERROR")}
            />
          ) : props.invitations.length === 0 ? (
            <p className="text-ui-ink-muted">
              {t("SETTINGS_UI.NO_INVITATIONS")}
            </p>
          ) : (
            props.invitations.map((invitation) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-ui-control border border-ui-line p-4"
                key={invitation.id}
              >
                <div className="min-w-0">
                  <strong className="break-all text-ui-ink">
                    {invitation.email}
                  </strong>
                  <p className="mt-1 text-sm text-ui-ink-muted">
                    {t("SETTINGS_UI.EXPIRES_DATE", {
                      date: new Date(invitation.expires_at).toLocaleDateString(
                        locale,
                      ),
                      role: t(roleKey(invitation.role)),
                    })}
                  </p>
                </div>
                <span className="rounded-ui-status bg-state-warning-soft px-3 py-1 text-sm text-state-warning">
                  {t(
                    `SETTINGS_UI.INVITATION_STATUS_${invitation.status.toUpperCase()}`,
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <InviteMemberDialog
        announceError={props.announceInviteError}
        error={props.inviteError}
        isSubmitting={props.isInviting}
        onClose={() => setInviteOpen(false)}
        onSubmit={async (payload) => {
          await props.onInvite(payload);
          setInviteOpen(false);
        }}
        open={inviteOpen}
      />
    </div>
  );
}
