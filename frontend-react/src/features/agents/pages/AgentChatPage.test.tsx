import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { AgentChatPage } from "./AgentChatPage";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(), createSession: vi.fn(), deleteAgent: vi.fn(), deleteSession: vi.fn(), getAgent: vi.fn(),
  listAgents: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(), updateAgent: vi.fn(),
}));
vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../settings/api/workspace-runtime-api", () => ({ listWorkspaceMembers: vi.fn() }));

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const newSession = { agent_id: agentId, created_at: "2026-07-24T09:00:00Z", created_by: "user-1", id: "44444444-4444-4444-8444-444444444444", title: "New conversation", updated_at: "2026-07-24T09:00:00Z", workspace_id: workspaceId };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: "/dashboard/agents/:agentId/chat", element: <AgentChatPage /> }],
    { initialEntries: [`/dashboard/agents/${agentId}/chat`] },
  );
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("AgentChatPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    agentsApi.getAgent.mockResolvedValue({
      avatar_color: "bg-emerald-500", avatar_icon: "brain", created_at: "2026-07-20T00:00:00Z", created_by: "user-1",
      id: agentId, is_active: true, is_default: false, model_name: "gemini-2.5-flash", name: "Research guide",
      system_prompt: "Answer using evidence.", temperature: 0.2, updated_at: "2026-07-24T00:00:00Z", workspace_id: workspaceId,
    });
    agentsApi.listSessions.mockResolvedValue([
      { agent_id: agentId, created_at: "2026-07-24T08:00:00Z", created_by: "user-1", id: sessionId, title: "Benefits question", updated_at: "2026-07-24T08:00:00Z", workspace_id: workspaceId },
    ]);
    agentsApi.listMessages.mockResolvedValue([
      { citations: [{ content: "Permanent employees are eligible.", score: 0.93, source_document: "Benefits.pdf" }], content: "Permanent employees are eligible.", created_at: "2026-07-24T08:30:00Z", created_by: "assistant", id: "33333333-3333-4333-8333-333333333333", role: "assistant", session_id: sessionId },
    ]);
    agentsApi.createSession.mockResolvedValue(newSession);
    agentsApi.deleteSession.mockResolvedValue(true);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
  });

  it("selects the first session and renders message citations", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Research guide" })).toBeInTheDocument();
    expect(await screen.findByText("Permanent employees are eligible.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show 1 citation/i }));
    expect(screen.getByText("Benefits.pdf")).toBeInTheDocument();
  });

  it("creates and selects a new session", async () => {
    const user = userEvent.setup();
    agentsApi.listSessions
      .mockResolvedValueOnce([
        { agent_id: agentId, created_at: "2026-07-24T08:00:00Z", created_by: "user-1", id: sessionId, title: "Benefits question", updated_at: "2026-07-24T08:00:00Z", workspace_id: workspaceId },
      ])
      .mockResolvedValueOnce([newSession]);
    renderPage();
    await screen.findByText("Benefits question");

    await user.click(screen.getByRole("button", { name: /new conversation/i }));
    await waitFor(() => expect(agentsApi.createSession).toHaveBeenCalledWith(workspaceId, agentId, {}));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^new conversation$/i })).toHaveLength(2),
    );
  });

  it("keeps the active session when backend deletion returns false", async () => {
    const user = userEvent.setup();
    agentsApi.deleteSession.mockResolvedValueOnce(false);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("Benefits question");

    await user.click(screen.getByRole("button", { name: /delete benefits question/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be deleted/i);
    expect(screen.getByText("Benefits question")).toBeInTheDocument();
    expect(screen.getByText("Permanent employees are eligible.")).toBeInTheDocument();
  });

  it("selects the remaining state after a successful session deletion", async () => {
    const user = userEvent.setup();
    agentsApi.listSessions.mockResolvedValueOnce([
      { agent_id: agentId, created_at: "2026-07-24T08:00:00Z", created_by: "user-1", id: sessionId, title: "Benefits question", updated_at: "2026-07-24T08:00:00Z", workspace_id: workspaceId },
    ]).mockResolvedValueOnce([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("Benefits question");

    await user.click(screen.getByRole("button", { name: /delete benefits question/i }));
    expect(await screen.findByText("No conversations yet.")).toBeInTheDocument();
    expect(screen.getByText("Choose a conversation")).toBeInTheDocument();
  });

  it("renders a retryable conversation-history error", async () => {
    const user = userEvent.setup();
    agentsApi.listSessions
      .mockRejectedValueOnce(new Error("Conversation history is unavailable."))
      .mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Conversation history is unavailable.");
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No conversations yet.")).toBeInTheDocument();
  });
});
