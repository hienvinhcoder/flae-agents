import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { AgentChatPage } from "./AgentChatPage";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(), createSession: vi.fn(), deleteAgent: vi.fn(), deleteSession: vi.fn(), getAgent: vi.fn(),
  getDefaultAgent: vi.fn(), listAgents: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(), updateAgent: vi.fn(),
}));
const chatApi = vi.hoisted(() => ({ streamChat: vi.fn() }));
vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../chat/api/chat-api", () => chatApi);
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
  return render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
    </TestI18nProvider>,
  );
}

describe("AgentChatPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    chatApi.streamChat.mockReset().mockResolvedValue(undefined);
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

  it("exposes the agent chat workbench landmarks", async () => {
    renderPage();

    expect(await screen.findByRole("region", { name: "Message Research guide" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Conversation history" })).toBeInTheDocument();
    expect(screen.getByTestId("message-viewport")).toHaveAccessibleName("Conversation messages");
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

  it("uses safe copy without duplicating the global alert for a server mutation failure", async () => {
    const user = userEvent.setup();
    agentsApi.deleteSession.mockRejectedValueOnce(new AppError({
      kind: "server",
      message: "Raw service outage details",
      retryable: true,
      status: 503,
    }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("Benefits question");

    await user.click(screen.getByRole("button", { name: /delete benefits question/i }));

    expect(await screen.findByText("The conversation could not be deleted.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw service outage details")).not.toBeInTheDocument();
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

  it("streams a message and reloads persisted history after done", async () => {
    const user = userEvent.setup();
    let onEvent: ((event: unknown) => void) | undefined;
    let resolveStream: (() => void) | undefined;
    agentsApi.listMessages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        citations: [], content: "Persisted answer", created_at: "2026-07-24T09:00:00Z", created_by: "assistant",
        id: "55555555-5555-4555-8555-555555555555", role: "assistant", session_id: sessionId,
      }]);
    chatApi.streamChat.mockImplementation((options: { onEvent: (event: unknown) => void }) => {
      onEvent = options.onEvent;
      return new Promise<void>((resolve) => { resolveStream = resolve; });
    });
    renderPage();
    await screen.findByText(/this conversation has no messages yet/i);

    await user.type(screen.getByRole("textbox", { name: /message research guide/i }), "  What is covered?  ");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("What is covered?")).toBeInTheDocument();
    act(() => onEvent?.({ text: "Streaming answer", type: "token" }));
    expect(await screen.findByText("Streaming answer")).toBeInTheDocument();
    act(() => {
      onEvent?.({ type: "done" });
      resolveStream?.();
    });
    expect(await screen.findByText("Persisted answer")).toBeInTheDocument();
    expect(agentsApi.listMessages).toHaveBeenCalledTimes(2);
  });

  it("does not lose a new input while terminal history reload is pending", async () => {
    const user = userEvent.setup();
    let resolveReload: ((messages: unknown[]) => void) | undefined;
    agentsApi.listMessages
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise<unknown[]>((resolve) => {
        resolveReload = resolve;
      }));
    chatApi.streamChat
      .mockImplementationOnce((options: { onEvent: (event: unknown) => void }) => {
        options.onEvent({ type: "done" });
        return Promise.resolve();
      })
      .mockImplementationOnce(() => new Promise<void>(() => undefined));
    renderPage();
    await screen.findByText(/this conversation has no messages yet/i);

    await user.type(screen.getByRole("textbox", { name: /message research guide/i }), "First question");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await user.type(await screen.findByRole("textbox", { name: /message research guide/i }), "Second question");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(chatApi.streamChat).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Second question")).toBeInTheDocument();
    act(() => resolveReload?.([]));
    await waitFor(() => expect(screen.getByText("Second question")).toBeInTheDocument());
  });

  it("shows connection fallback and retries a transport failure once", async () => {
    const user = userEvent.setup();
    agentsApi.listMessages.mockResolvedValue([]);
    chatApi.streamChat
      .mockRejectedValueOnce(new AppError({
        code: "SSE_PROTOCOL_ERROR", kind: "server", message: "Invalid stream event.", retryable: true,
      }))
      .mockImplementationOnce((options: { onEvent: (event: unknown) => void }) => {
        options.onEvent({ type: "done" });
        return Promise.resolve();
      });
    renderPage();
    await screen.findByText(/this conversation has no messages yet/i);

    await user.type(screen.getByRole("textbox", { name: /message research guide/i }), "Retry question");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/response was interrupted by a connection error/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid stream event.");
    await user.click(screen.getByRole("button", { name: /retry message/i }));
    await waitFor(() => expect(chatApi.streamChat).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: /retry message/i })).not.toBeInTheDocument();
  });

  it("stops and aborts an active stream on request and unmount", async () => {
    const user = userEvent.setup();
    const signals: AbortSignal[] = [];
    chatApi.streamChat.mockImplementation((options: { signal: AbortSignal }) => {
      signals.push(options.signal);
      return new Promise<void>(() => undefined);
    });
    agentsApi.listMessages.mockResolvedValue([]);
    const view = renderPage();
    await screen.findByText(/this conversation has no messages yet/i);

    await user.type(screen.getByRole("textbox", { name: /message research guide/i }), "First request");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    await user.click(await screen.findByRole("button", { name: /stop response/i }));
    expect(signals[0]?.aborted).toBe(true);

    await user.type(screen.getByRole("textbox", { name: /message research guide/i }), "Second request");
    await user.click(screen.getByRole("button", { name: /send message/i }));
    view.unmount();
    expect(signals[1]?.aborted).toBe(true);
  });
});
