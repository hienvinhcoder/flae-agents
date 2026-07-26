import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { InviteMemberDialog } from "./InviteMemberDialog";
import type { InviteMemberForm } from "../schemas/workspace-schema";
import type {
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceMemberStatus,
  WorkspaceRole,
} from "../types/workspace";

interface WorkspaceMembersPanelProps {
  actionError?: string;
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

function displayName(member: WorkspaceMember) {
  return member.full_name?.trim() || member.email || "Workspace member";
}

export function WorkspaceMembersPanel(props: WorkspaceMembersPanelProps) {
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

  if (props.isLoading)
    return <Skeleton label="Loading workspace members" lines={4} />;
  if (props.membersError)
    return (
      <ErrorState
        message={props.membersError}
        onRetry={props.onRetryMembers}
        title="Unable to load workspace members"
      />
    );

  return (
    <div className="grid gap-6">
      <section className="surface-panel p-6" aria-labelledby="members-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className="text-xl font-semibold text-ui-ink"
              id="members-title"
            >
              Members
            </h2>
            <p className="mt-1 text-ui-ink-secondary">
              Manage roles and workspace access.
            </p>
          </div>
          {canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden className="h-4 w-4" />
              Invite member
            </Button>
          ) : null}
        </div>
        {props.actionError ? (
          <p className="mt-4 text-state-danger" role="alert">
            {props.actionError}
          </p>
        ) : null}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ui-divider text-ui-ink-muted">
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-divider">
              {props.members.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-ui-ink-muted"
                    colSpan={4}
                  >
                    No workspace members found.
                  </td>
                </tr>
              ) : (
                props.members.map((member) => {
                  const name = displayName(member);
                  return (
                    <tr key={member.user_uid}>
                      <td className="px-3 py-3">
                        <strong className="block text-ui-ink">{name}</strong>
                        <span className="text-sm text-ui-ink-muted">
                          {member.email}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {canManage(member) ? (
                          <select
                            aria-label={`Role for ${name}`}
                            className="min-h-10 rounded-ui-control border border-ui-line bg-ui-raised px-2"
                            onChange={(event) =>
                              void props.onUpdate(
                                member.user_uid,
                                event.target.value as WorkspaceRole,
                                member.status,
                              )
                            }
                            value={member.role}
                          >
                            {rolesFor().map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          member.role
                        )}
                      </td>
                      <td className="px-3 py-3">{member.status}</td>
                      <td className="px-3 py-3 text-right">
                        {canManage(member) ? (
                          <Button
                            aria-label={`Remove ${name}`}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${name} from this workspace?`,
                                )
                              )
                                void props.onRemove(member.user_uid);
                            }}
                            variant="danger"
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="surface-panel p-6"
        aria-labelledby="invitations-title"
      >
        <h2
          className="text-xl font-semibold text-ui-ink"
          id="invitations-title"
        >
          Pending invitations
        </h2>
        <div className="mt-4 grid gap-3">
          {props.isInvitationsLoading ? (
            <Skeleton label="Loading pending invitations" lines={2} />
          ) : props.invitationsError ? (
            <ErrorState
              message={props.invitationsError}
              onRetry={props.onRetryInvitations}
              retryLabel="Retry invitations"
              title="Unable to load invitations"
            />
          ) : props.invitations.length === 0 ? (
            <p className="text-ui-ink-muted">No pending invitations.</p>
          ) : (
            props.invitations.map((invitation) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-ui-control border border-ui-line p-4"
                key={invitation.id}
              >
                <div>
                  <strong className="text-ui-ink">{invitation.email}</strong>
                  <p className="text-sm text-ui-ink-muted">
                    {invitation.role} · expires{" "}
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-ui-status bg-state-warning-soft px-3 py-1 text-sm text-state-warning">
                  {invitation.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <InviteMemberDialog
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
