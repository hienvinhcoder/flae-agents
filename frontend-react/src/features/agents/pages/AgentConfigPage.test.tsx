import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { AgentConfigPage } from "./AgentConfigPage";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(), deleteAgent: vi.fn(), getAgent: vi.fn(), listAgents: vi.fn(),
  createSession: vi.fn(), deleteSession: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(), updateAgent: vi.fn(),
}));
const workspaceApi = vi.hoisted(() => ({ listWorkspaceMembers: vi.fn() }));
vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../settings/api/workspace-runtime-api", () => workspaceApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const userUid = "user-1";

function renderPage(path = "/dashboard/agents/new") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/dashboard/agents", element: <p>Agent list destination</p> },
      { path: "/dashboard/agents/new", element: <AgentConfigPage /> },
      { path: "/dashboard/agents/:agentId/edit", element: <AgentConfigPage /> },
    ],
    { initialEntries: [path] },
  );
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}

describe("AgentConfigPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    workspaceApi.listWorkspaceMembers.mockReset();
    workspaceApi.listWorkspaceMembers.mockResolvedValue([
      { avatar_url: null, email: "owner@example.com", full_name: "Owner", role: "owner", status: "active", user_uid: userUid, workspace_id: workspaceId },
    ]);
    agentsApi.createAgent.mockResolvedValue({ id: agentId });
    agentsApi.getAgent.mockResolvedValue({
      avatar_color: "bg-rose-500", avatar_icon: "sparkles", created_at: "2026-07-20T00:00:00Z", created_by: userUid,
      id: agentId, is_active: true, is_default: false, model_name: "gemini-1.5-pro", name: "Policy guide",
      system_prompt: "Use only approved policy documents.", temperature: 0.7, updated_at: "2026-07-24T00:00:00Z", workspace_id: workspaceId,
    });
    agentsApi.updateAgent.mockResolvedValue({ id: agentId });
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
    useAuthStore.getState().setAuthenticated({ avatar_url: null, current_workspace_id: workspaceId, email: "owner@example.com", firebase_uid: userUid, full_name: "Owner", id: "profile-1", is_active: true, login_providers: ["email_password"] });
  });

  it("creates a valid agent and returns to the list", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: /create ai agent/i });
    await user.type(screen.getByRole("textbox", { name: /agent name/i }), "Operations guide");
    await user.type(screen.getByRole("textbox", { name: /system prompt/i }), "Answer operational questions.");
    await user.click(screen.getByRole("button", { name: /^create agent$/i }));

    await waitFor(() => expect(agentsApi.createAgent).toHaveBeenCalledWith(workspaceId, expect.objectContaining({ name: "Operations guide", system_prompt: "Answer operational questions." })));
    expect(await screen.findByText("Agent list destination")).toBeInTheDocument();
  });

  it("loads an existing agent and submits a partial update", async () => {
    const user = userEvent.setup();
    renderPage(`/dashboard/agents/${agentId}/edit`);

    const name = await screen.findByRole("textbox", { name: /agent name/i });
    expect(name).toHaveValue("Policy guide");
    await user.clear(name);
    await user.type(name, "Policy partner");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(agentsApi.updateAgent).toHaveBeenCalledWith(workspaceId, agentId, { name: "Policy partner" }));
  });

  it("keeps form values available after a create error", async () => {
    const user = userEvent.setup();
    agentsApi.createAgent.mockRejectedValueOnce(new Error("Agent creation is temporarily unavailable."));
    renderPage();

    const name = await screen.findByRole("textbox", { name: /agent name/i });
    await user.type(name, "Operations guide");
    await user.type(screen.getByRole("textbox", { name: /system prompt/i }), "Answer operational questions.");
    await user.click(screen.getByRole("button", { name: /^create agent$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Agent creation is temporarily unavailable.");
    expect(name).toHaveValue("Operations guide");
  });

  it("redirects a member before allowing configuration", async () => {
    workspaceApi.listWorkspaceMembers.mockResolvedValueOnce([
      { avatar_url: null, email: "member@example.com", full_name: "Member", role: "member", status: "active", user_uid: userUid, workspace_id: workspaceId },
    ]);
    renderPage();
    expect(await screen.findByText("Agent list destination")).toBeInTheDocument();
    expect(agentsApi.createAgent).not.toHaveBeenCalled();
  });

  it("redirects when the requested agent cannot be loaded", async () => {
    agentsApi.getAgent.mockRejectedValueOnce(new Error("Agent not found."));
    renderPage(`/dashboard/agents/${agentId}/edit`);

    expect(await screen.findByText("Agent list destination")).toBeInTheDocument();
  });
});
