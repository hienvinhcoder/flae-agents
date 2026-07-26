import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/lib/query-keys";
import * as runtimeApi from "../api/workspace-runtime-api";
import type {
  Workspace,
  WorkspaceInvitationPayload,
  WorkspaceMemberUpdatePayload,
  WorkspaceNamePayload,
} from "../types/workspace";

export function useWorkspaceSettings(workspaceId: string | null) {
  const queryClient = useQueryClient();
  const enabled = Boolean(workspaceId);
  const members = useQuery({
    enabled,
    queryFn: () => runtimeApi.listWorkspaceMembers(workspaceId as string),
    queryKey: queryKeys.workspaceMembers(workspaceId ?? "none"),
  });
  const invitations = useQuery({
    enabled,
    queryFn: () => runtimeApi.listPendingInvitations(workspaceId as string),
    queryKey: queryKeys.workspaceInvitations(workspaceId ?? "none"),
  });

  const rename = useMutation({
    mutationFn: (payload: WorkspaceNamePayload) =>
      runtimeApi.updateWorkspace(workspaceId as string, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Workspace[]>(
        queryKeys.workspaces,
        (current = []) =>
          current.map((workspace) =>
            workspace.id === updated.id ? updated : workspace,
          ),
      );
      return queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
  const create = useMutation({
    mutationFn: runtimeApi.createManualWorkspace,
    onSuccess: (created) => {
      queryClient.setQueryData<Workspace[]>(
        queryKeys.workspaces,
        (current = []) => [created, ...current],
      );
      return queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
  const invite = useMutation({
    mutationFn: (payload: WorkspaceInvitationPayload) =>
      runtimeApi.inviteWorkspaceMember(workspaceId as string, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceInvitations(workspaceId as string),
      }),
  });
  const updateMember = useMutation({
    mutationFn: ({
      payload,
      userUid,
    }: {
      payload: WorkspaceMemberUpdatePayload;
      userUid: string;
    }) =>
      runtimeApi.updateWorkspaceMember(workspaceId as string, userUid, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId as string),
      }),
  });
  const removeMember = useMutation({
    mutationFn: (userUid: string) =>
      runtimeApi.removeWorkspaceMember(workspaceId as string, userUid),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId as string),
      }),
  });

  return {
    create,
    invitations,
    invite,
    members,
    removeMember,
    rename,
    updateMember,
  };
}
