import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { AgentDetail } from "../types/agent";
import { AgentListPage } from "./AgentListPage";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(),
  createSession: vi.fn(),
  deleteAgent: vi.fn(),
  deleteSession: vi.fn(),
  getAgent: vi.fn(),
  listAgents: vi.fn(),
  listMessages: vi.fn(),
  listSessions: vi.fn(),
  updateAgent: vi.fn(),
}));
const workspaceApi = vi.hoisted(() => ({ listWorkspaceMembers: vi.fn() }));

vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../settings/api/workspace-runtime-api", () => workspaceApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nextWorkspaceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userUid = "user-1";
const agent: AgentDetail = {
  avatar_color: "bg-emerald-500",
  avatar_icon: "brain",
  created_at: "2026-07-20T00:00:00Z",
  created_by: userUid,
  id: "11111111-1111-4111-8111-111111111111",
  is_active: true,
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "Research guide",
  system_prompt: "Answer using workspace evidence.",
  temperature: 0.2,
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/dashboard/agents", element: <AgentListPage /> },
      { path: "/dashboard/agents/new", element: <p>Create destination</p> },
    ],
    { initialEntries: ["/dashboard/agents"] },
  );
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </TestI18nProvider>,
  );
  return { queryClient, router };
}

describe("AgentListPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    workspaceApi.listWorkspaceMembers.mockReset();
    agentsApi.listAgents.mockResolvedValue([agent]);
    agentsApi.deleteAgent.mockResolvedValue(true);
    workspaceApi.listWorkspaceMembers.mockResolvedValue([
      {
        avatar_url: null,
        email: "owner@example.com",
        full_name: "Owner",
        role: "owner",
        status: "active",
        user_uid: userUid,
        workspace_id: workspaceId,
      },
    ]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
    useAuthStore.getState().setAuthenticated({
      avatar_url: null,
      current_workspace_id: workspaceId,
      email: "owner@example.com",
      firebase_uid: userUid,
      full_name: "Owner",
      id: "profile-1",
      is_active: true,
      login_providers: ["email_password"],
    });
  });

  it("shows management actions only after an owner role resolves", async () => {
    renderPage();

    expect(await screen.findByText("Research guide")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /create agent/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit research guide/i })).toBeInTheDocument();
  });

  it("uses the Explorer heading and feature-owned empty state", async () => {
    agentsApi.listAgents.mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "AI agents" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "No agents yet" })).toBeInTheDocument();
    expect(screen.getByText("Build focused assistants that answer with workspace knowledge and operating context.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /create agent/i })).toHaveLength(2);
  });

  it("announces a query failure once and keeps retry available", async () => {
    agentsApi.listAgents.mockRejectedValueOnce(new Error("Agents are temporarily unavailable."));
    renderPage();

    expect(await screen.findAllByRole("alert")).toHaveLength(1);
    expect(screen.getAllByText("Agents are temporarily unavailable.")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("explains that a workspace selection is required", () => {
    useWorkspaceStore.getState().reset();
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Select a workspace" })).toBeInTheDocument();
    expect(screen.getByText("Select a workspace before managing agents.")).toBeInTheDocument();
  });

  it("falls back to member permissions when role lookup fails", async () => {
    workspaceApi.listWorkspaceMembers.mockRejectedValueOnce(new Error("Permission lookup failed."));
    renderPage();

    expect(await screen.findByText("Research guide")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create agent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit research guide/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /chat with research guide/i })).toBeInTheDocument();
  });

  it("preserves the card when deletion fails", async () => {
    const user = userEvent.setup();
    agentsApi.deleteAgent.mockRejectedValueOnce(new Error("Agent could not be deleted."));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    await screen.findByText("Research guide");
    await user.click(screen.getByRole("button", { name: /delete research guide/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Agent could not be deleted.");
    expect(screen.getByText("Research guide")).toBeInTheDocument();
  });

  it("does not request deletion when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();

    await screen.findByText("Research guide");
    await user.click(screen.getByRole("button", { name: /delete research guide/i }));
    expect(agentsApi.deleteAgent).not.toHaveBeenCalled();
    expect(screen.getByText("Research guide")).toBeInTheDocument();
  });

  it("removes the card after a confirmed successful deletion", async () => {
    const user = userEvent.setup();
    agentsApi.listAgents.mockResolvedValueOnce([agent]).mockResolvedValueOnce([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();

    await screen.findByText("Research guide");
    await user.click(screen.getByRole("button", { name: /delete research guide/i }));
    await waitFor(() => expect(screen.queryByText("Research guide")).not.toBeInTheDocument());
    expect(screen.getByText("No agents yet")).toBeInTheDocument();
  });

  it("reloads the scoped list when the workspace changes", async () => {
    renderPage();
    await screen.findByText("Research guide");

    useWorkspaceStore.getState().setCurrentWorkspaceId(nextWorkspaceId);
    await waitFor(() =>
      expect(agentsApi.listAgents).toHaveBeenCalledWith(nextWorkspaceId, expect.any(AbortSignal)),
    );
  });
});
