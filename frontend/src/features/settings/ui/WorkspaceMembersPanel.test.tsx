import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { WorkspaceMember } from "../types/workspace";
import { WorkspaceMembersPanel } from "./WorkspaceMembersPanel";

function member(
  userUid: string,
  role: WorkspaceMember["role"],
  status: WorkspaceMember["status"] = "active",
): WorkspaceMember {
  return {
    avatar_url: null,
    email: `${userUid}@example.com`,
    full_name: userUid,
    role,
    status,
    user_uid: userUid,
    workspace_id: "ws-1",
  };
}

function renderPanel(members: readonly WorkspaceMember[], currentUserUid: string) {
  const onRemove = vi.fn().mockResolvedValue(undefined);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(
    <TestI18nProvider>
      <WorkspaceMembersPanel
        currentUserUid={currentUserUid}
        invitations={[]}
        isInvitationsLoading={false}
        isInviting={false}
        isLoading={false}
        members={members}
        onInvite={vi.fn().mockResolvedValue(undefined)}
        onRemove={onRemove}
        onRetryInvitations={vi.fn()}
        onRetryMembers={vi.fn()}
        onUpdate={onUpdate}
      />
    </TestI18nProvider>,
  );
  return { onRemove, onUpdate };
}

describe("WorkspaceMembersPanel", () => {
  it("keeps owner controls, current-user protection, and status payloads", async () => {
    const user = userEvent.setup();
    const owner = member("Current Owner", "owner");
    const target = member("Member One", "member", "suspended");
    const { onUpdate } = renderPanel([owner, target], owner.user_uid);

    const ownerSummary = screen.getByRole("article", { name: owner.full_name! });
    expect(within(ownerSummary).queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      within(ownerSummary).queryByRole("button", { name: /remove/i }),
    ).not.toBeInTheDocument();

    const targetSummary = screen.getByRole("article", {
      name: target.full_name!,
    });
    expect(targetSummary).toHaveTextContent("Suspended");
    const role = within(targetSummary).getByRole("combobox", {
      name: "Role for Member One",
    });
    expect(within(role).getAllByRole("option").map((option) => option.textContent))
      .toEqual(["Admin", "Member", "Viewer"]);
    await user.selectOptions(role, "viewer");
    expect(onUpdate).toHaveBeenCalledWith(
      target.user_uid,
      "viewer",
      "suspended",
    );
  });

  it("limits an admin to member and viewer management", () => {
    const currentAdmin = member("Current Admin", "admin");
    const owner = member("Workspace Owner", "owner");
    const peerAdmin = member("Peer Admin", "admin");
    const target = member("Member One", "member");
    renderPanel([owner, currentAdmin, peerAdmin, target], currentAdmin.user_uid);

    for (const protectedMember of [owner, currentAdmin, peerAdmin]) {
      const summary = screen.getByRole("article", {
        name: protectedMember.full_name!,
      });
      expect(within(summary).queryByRole("combobox")).not.toBeInTheDocument();
      expect(
        within(summary).queryByRole("button", { name: /remove/i }),
      ).not.toBeInTheDocument();
    }
    const targetRole = within(
      screen.getByRole("article", { name: target.full_name! }),
    ).getByRole("combobox");
    expect(
      within(targetRole).getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Member", "Viewer"]);
    expect(
      screen.getByRole("button", { name: "Invite member" }),
    ).toBeInTheDocument();
  });
});
