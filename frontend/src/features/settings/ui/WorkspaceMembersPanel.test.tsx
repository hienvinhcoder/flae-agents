import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { i18n as I18nInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { createI18n } from "../../../shared/i18n";
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

function renderPanel(
  members: readonly WorkspaceMember[],
  currentUserUid: string,
  options: { i18n?: I18nInstance; membersError?: string } = {},
) {
  const onRemove = vi.fn().mockResolvedValue(undefined);
  const onRetryMembers = vi.fn();
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const panel = (
    <WorkspaceMembersPanel
      currentUserUid={currentUserUid}
      invitations={[]}
      isInvitationsLoading={false}
      isInviting={false}
      isLoading={false}
      members={members}
      membersError={options.membersError}
      onInvite={vi.fn().mockResolvedValue(undefined)}
      onRemove={onRemove}
      onRetryInvitations={vi.fn()}
      onRetryMembers={onRetryMembers}
      onUpdate={onUpdate}
    />
  );
  render(
    options.i18n ? (
      <I18nextProvider i18n={options.i18n}>{panel}</I18nextProvider>
    ) : (
      <TestI18nProvider>{panel}</TestI18nProvider>
    ),
  );
  return { onRemove, onRetryMembers, onUpdate };
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

  it("localizes the fallback identity and accessible member controls", async () => {
    const i18n = await createI18n(
      { en: { translation: en }, vi: { translation: viMessages } },
      "vi",
    );
    const owner = member("Current Owner", "owner");
    const anonymous = {
      ...member("anonymous", "member"),
      email: null,
      full_name: null,
    };
    renderPanel([owner, anonymous], owner.user_uid, { i18n });

    const summary = screen.getByRole("article", { name: "Thành viên" });
    expect(summary).toHaveTextContent("Thành viên");
    expect(
      within(summary).getByRole("combobox", {
        name: "Vai trò của Thành viên",
      }),
    ).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", { name: "Xóa Thành viên" }),
    ).toBeInTheDocument();
  });

  it("localizes the members retry action", async () => {
    const i18n = await createI18n(
      { en: { translation: en }, vi: { translation: viMessages } },
      "vi",
    );
    const { onRetryMembers } = renderPanel([], "owner-1", {
      i18n,
      membersError: "Không thể tải thành viên không gian làm việc",
    });

    const retry = screen.getByRole("button", { name: "Thử lại" });
    await userEvent.click(retry);
    expect(onRetryMembers).toHaveBeenCalledOnce();
  });
});
