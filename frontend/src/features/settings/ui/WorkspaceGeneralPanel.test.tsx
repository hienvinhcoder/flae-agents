import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { WorkspaceGeneralPanel } from "./WorkspaceGeneralPanel";

const workspace = {
  created_at: null,
  id: "ws-1",
  name: "Platform",
  owner_uid: "owner-1",
};

describe("WorkspaceGeneralPanel", () => {
  it("preserves create submission and cancel behavior", async () => {
    const user = userEvent.setup();
    const onCancelCreate = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TestI18nProvider>
        <WorkspaceGeneralPanel
          createMode
          isSaving={false}
          onCancelCreate={onCancelCreate}
          onSave={onSave}
          workspace={workspace}
        />
      </TestI18nProvider>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Workspace name" }),
      "Product Lab",
    );
    await user.click(screen.getByRole("button", { name: "Save workspace" }));
    expect(onSave).toHaveBeenCalledWith({ name: "Product Lab" });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancelCreate).toHaveBeenCalledOnce();
  });

  it("resets the rename draft when the workspace changes", async () => {
    const user = userEvent.setup();
    const props = {
      createMode: false,
      isSaving: false,
      onCancelCreate: vi.fn(),
      onSave: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = render(
      <TestI18nProvider>
        <WorkspaceGeneralPanel {...props} workspace={workspace} />
      </TestI18nProvider>,
    );
    const input = screen.getByRole("textbox", { name: "Workspace name" });
    await user.clear(input);
    await user.type(input, "Unsaved draft");

    rerender(
      <TestI18nProvider>
        <WorkspaceGeneralPanel
          {...props}
          workspace={{ ...workspace, id: "ws-2", name: "Research" }}
        />
      </TestI18nProvider>,
    );

    expect(input).toHaveValue("Research");
  });
});
