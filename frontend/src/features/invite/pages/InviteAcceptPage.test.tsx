import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import type { Workspace } from "../../settings/types/workspace";
import { InviteAcceptPage } from "./InviteAcceptPage";

const acceptWorkspaceInvitation =
  vi.fn<(payload: { token: string }) => Promise<Workspace>>();

vi.mock("../api/invite-api", () => ({
  acceptWorkspaceInvitation: (payload: { token: string }) =>
    acceptWorkspaceInvitation(payload),
}));

function renderInvite(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/invite", element: <InviteAcceptPage /> },
      { path: "/dashboard", element: <p>Dashboard home</p> },
      {
        path: "/dashboard/settings",
        element: <p>Workspace settings destination</p>,
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { queryClient, router };
}

describe("InviteAcceptPage", () => {
  beforeEach(() => {
    acceptWorkspaceInvitation.mockReset();
    useWorkspaceStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("redirects an invitation without a token to the dashboard", async () => {
    renderInvite("/invite");
    expect(await screen.findByText("Dashboard home")).toBeInTheDocument();
    expect(acceptWorkspaceInvitation).not.toHaveBeenCalled();
  });

  it("accepts an invitation, selects the workspace, and redirects to settings", async () => {
    vi.useFakeTimers();
    const workspace = {
      id: "ws-2",
      name: "Research",
      owner_uid: "owner-2",
      created_at: null,
    };
    acceptWorkspaceInvitation.mockResolvedValue(workspace);
    const { queryClient } = renderInvite("/invite?token=invite-token");

    fireEvent.click(screen.getByRole("button", { name: /accept invitation/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByRole("heading", { name: /joined successfully/i }),
    ).toBeInTheDocument();
    expect(acceptWorkspaceInvitation).toHaveBeenCalledWith({
      token: "invite-token",
    });
    expect(useWorkspaceStore.getState().currentWorkspaceId).toBe("ws-2");
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([workspace]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(
      screen.getByText("Workspace settings destination"),
    ).toBeInTheDocument();
  });

  it("returns to the dashboard after an invitation acceptance failure", async () => {
    acceptWorkspaceInvitation.mockRejectedValue(new Error("expired"));
    renderInvite("/invite?token=expired-token");

    fireEvent.click(screen.getByRole("button", { name: /accept invitation/i }));

    expect(await screen.findByText("Dashboard home")).toBeInTheDocument();
  });

  it("asks for confirmation before rejecting an invitation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderInvite("/invite?token=invite-token");

    fireEvent.click(screen.getByRole("button", { name: /decline/i }));

    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(await screen.findByText("Dashboard home")).toBeInTheDocument();
  });
});
