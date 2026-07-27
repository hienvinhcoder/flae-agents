import { describe, expect, it } from "vitest";

import en from "../../../public/assets/i18n/en.json";
import viMessages from "../../../public/assets/i18n/vi.json";

describe("Settings locale contract", () => {
  it("keeps the exact Settings copy contract in parity across locales", () => {
    expect(en.SETTINGS_UI).toEqual({
      TITLE: "Workspace settings",
      EYEBROW: "FLAE workspace",
      DESCRIPTION: "Manage workspace details, members, and access.",
      SECTIONS_ARIA: "Workspace settings sections",
      GENERAL: "General",
      MEMBERS: "Members",
      CREATE_WORKSPACE: "Create workspace",
      GENERAL_INFORMATION: "General information",
      GENERAL_DESCRIPTION: "Use a clear name your team will recognize.",
      WORKSPACE_NAME: "Workspace name",
      SAVE_WORKSPACE: "Save workspace",
      SAVING_WORKSPACE: "Saving workspace",
      CANCEL: "Cancel",
      SELECT_WORKSPACE: "Select a workspace before editing its settings.",
      MEMBERS_DESCRIPTION: "Manage roles and workspace access.",
      INVITE_MEMBER: "Invite member",
      LOADING_MEMBERS: "Loading workspace members",
      LOAD_MEMBERS_ERROR: "Unable to load workspace members",
      NO_MEMBERS: "No workspace members found.",
      MEMBER: "Member",
      ROLE: "Role",
      STATUS: "Status",
      ACTIONS: "Actions",
      ROLE_FOR: "Role for {{name}}",
      ROLE_OWNER: "Owner",
      ROLE_ADMIN: "Admin",
      ROLE_MEMBER: "Member",
      ROLE_VIEWER: "Viewer",
      STATUS_ACTIVE: "Active",
      STATUS_SUSPENDED: "Suspended",
      REMOVE_MEMBER: "Remove {{name}}",
      REMOVE_CONFIRM: "Remove {{name}} from this workspace?",
      REMOVE: "Remove",
      PENDING_INVITATIONS: "Pending invitations",
      LOADING_INVITATIONS: "Loading pending invitations",
      LOAD_INVITATIONS_ERROR: "Unable to load invitations",
      RETRY_INVITATIONS: "Retry invitations",
      NO_INVITATIONS: "No pending invitations.",
      INVITATION_STATUS_PENDING: "Pending",
      INVITATION_STATUS_ACCEPTED: "Accepted",
      INVITATION_STATUS_EXPIRED: "Expired",
      INVITE_TITLE: "Invite workspace member",
      INVITE_DESCRIPTION:
        "Send an invitation with the minimum access required.",
      EMAIL: "Email address",
      ROLE_LABEL: "Workspace role",
      SEND_INVITE: "Send invitation",
      SENDING_INVITE: "Sending invitation",
      EXPIRES_DATE: "{{role}} / expires {{date}}",
    });
    expect(Object.keys(viMessages.SETTINGS_UI)).toEqual(
      Object.keys(en.SETTINGS_UI),
    );
    expect(Object.keys(viMessages.SETTINGS_VALIDATION)).toEqual(
      Object.keys(en.SETTINGS_VALIDATION),
    );
  });
});
