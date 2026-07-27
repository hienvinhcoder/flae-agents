import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { createI18n } from "../../../shared/i18n";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import en from "../../../../public/assets/i18n/en.json";
import viLocale from "../../../../public/assets/i18n/vi.json";
import { ChatPage } from "./ChatPage";

const agentsApi = vi.hoisted(() => ({
  createSession: vi.fn(), deleteSession: vi.fn(), getDefaultAgent: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(),
}));
const chatApi = vi.hoisted(() => ({ streamChat: vi.fn() }));
vi.mock("../../agents/api/agents-runtime-api", () => agentsApi);
vi.mock("../api/chat-api", () => chatApi);
vi.mock("../../../core/auth/firebase", () => ({ getAuthToken: vi.fn().mockResolvedValue(null) }));
vi.mock("../../../core/config/env", () => ({ env: { VITE_API_URL: "https://api.example.test" } }));

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const agent = {
  avatar_color: "bg-blue-500", avatar_icon: "bot", created_at: "2026-07-20T00:00:00Z", created_by: "user-1",
  id: agentId, is_active: true, is_default: true, model_name: "gemini-2.5-flash", name: "Workspace assistant",
  system_prompt: "Answer from workspace sources.", temperature: 0.2, updated_at: "2026-07-24T00:00:00Z", workspace_id: workspaceId,
};
const sessions = [
  { agent_id: agentId, created_at: "2026-07-24T08:00:00Z", created_by: "user-1", id: sessionId, title: "First chat", updated_at: "2026-07-24T08:00:00Z", workspace_id: workspaceId },
  { agent_id: agentId, created_at: "2026-07-24T07:00:00Z", created_by: "user-1", id: "44444444-4444-4444-8444-444444444444", title: "Second chat", updated_at: "2026-07-24T07:00:00Z", workspace_id: workspaceId },
];
const createdSession = { ...sessions[0], id: "55555555-5555-4555-8555-555555555555", title: "New conversation" };
const viI18n = await createI18n({ en: { translation: en }, vi: { translation: viLocale } }, "vi");

function renderPage(language: "en" | "vi" = "en") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/dashboard/chat", element: <ChatPage /> }], { initialEntries: ["/dashboard/chat"] });
  const page = (
    <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
  );
  return language === "vi" ? render(
    <I18nextProvider i18n={viI18n}>{page}</I18nextProvider>,
  ) : render(
    <TestI18nProvider>
      {page}
    </TestI18nProvider>,
  );
}

describe("ChatPage", () => {
  beforeEach(() => {
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    chatApi.streamChat.mockReset().mockResolvedValue(undefined);
    agentsApi.getDefaultAgent.mockResolvedValue(agent);
    agentsApi.listSessions.mockResolvedValue(sessions);
    agentsApi.listMessages.mockResolvedValue([]);
    agentsApi.createSession.mockResolvedValue(createdSession);
    agentsApi.deleteSession.mockResolvedValue(true);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
    useWorkspaceStore.getState().setSelectionInitialized(true);
  });

  it("keeps the chat translation namespace limited to the approved keys", () => {
    const approvedKeys = [
      "ASK_AGENT", "BACK_TO_AGENTS", "CHOOSE_CONVERSATION", "CHOOSE_DESCRIPTION", "CONVERSATION_HISTORY",
      "CREATE_FAILED", "CREATING_CONVERSATION", "DEFAULT_AGENT_ERROR", "DELETE_CONFIRM", "DELETE_CONVERSATION",
      "DELETE_FAILED", "HISTORY_LOAD_ERROR", "HISTORY_UNAVAILABLE", "MESSAGES_ARIA", "MESSAGE_AGENT",
      "MESSAGE_HISTORY_UNAVAILABLE", "MESSAGE_LOAD_ERROR", "NEW_CONVERSATION", "NO_CONVERSATIONS", "NO_MESSAGES",
      "READY_ON_MODEL", "RETRY_MESSAGE", "SEARCH_CONVERSATIONS", "SEND_MESSAGE", "START_WITH_AGENT", "STOP_RESPONSE",
    ];

    expect(Object.keys(en.CHAT_UI).sort()).toEqual(approvedKeys);
    expect(Object.keys(viLocale.CHAT_UI).sort()).toEqual(approvedKeys);
    expect(en.NAV.CHAT).toBe("AI Chat");
    expect(viLocale.NAV.CHAT).toBe("AI Chat");
    expect(en.SHELL.CHAT_WORKBENCH_ARIA).toBe("Workspace assistant chat");
    expect(viLocale.SHELL.CHAT_WORKBENCH_ARIA).toBe("Trò chuyện với trợ lý không gian làm việc");
  });

  it("loads the default agent, then opens its first session", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Workspace assistant" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^first chat$/i })).toHaveAttribute("aria-current", "true");
    expect(agentsApi.listSessions).toHaveBeenCalledWith(workspaceId, agentId, expect.any(AbortSignal));
    expect(agentsApi.listMessages).toHaveBeenCalledWith(workspaceId, agentId, sessionId, expect.any(AbortSignal));
  });

  it("exposes the chat workbench landmarks and named message viewport", async () => {
    renderPage();

    expect(await screen.findByRole("region", { name: "Workspace assistant chat" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Conversation history" })).toBeInTheDocument();
    expect(screen.getByTestId("message-viewport")).toHaveAccessibleName("Conversation messages");
  });

  it("uses localized safe copy for a default-agent failure", async () => {
    agentsApi.getDefaultAgent.mockRejectedValueOnce(new Error("Raw default-agent service details"));
    renderPage("vi");

    expect(await screen.findByText("Không thể tải trợ lý mặc định của không gian làm việc.")).toBeInTheDocument();
    expect(screen.queryByText("Raw default-agent service details")).not.toBeInTheDocument();
  });

  it("creates, prepends, and selects a new conversation", async () => {
    const user = userEvent.setup();
    agentsApi.listSessions
      .mockResolvedValueOnce(sessions)
      .mockResolvedValueOnce([createdSession, ...sessions]);
    renderPage();
    await screen.findByRole("button", { name: /^first chat$/i });

    await user.click(screen.getByRole("button", { name: /new conversation/i }));

    await waitFor(() => expect(agentsApi.createSession).toHaveBeenCalledWith(workspaceId, agentId, {}));
    await waitFor(() => {
      const conversationButtons = screen.getAllByRole("button", { name: /^new conversation$/i });
      expect(conversationButtons.at(-1)).toHaveAttribute("aria-current", "true");
    });
  });

  it("deletes the active conversation and selects the next one", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByRole("button", { name: /^first chat$/i });

    await user.click(screen.getByRole("button", { name: /delete first chat/i }));

    await waitFor(() => expect(agentsApi.deleteSession).toHaveBeenCalledWith(workspaceId, agentId, sessionId));
    expect(screen.getByRole("button", { name: /^second chat$/i })).toHaveAttribute("aria-current", "true");
  });

  it("clears chat state and aborts streaming when the workspace is cleared", async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;
    chatApi.streamChat.mockImplementation((options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise<void>(() => undefined);
    });
    renderPage();
    await screen.findByRole("button", { name: /^first chat$/i });
    await user.type(screen.getByRole("textbox", { name: /message workspace assistant/i }), "Question");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId(null));

    expect(await screen.findByText("Select a workspace to start chatting.")).toBeInTheDocument();
    expect(signal?.aborted).toBe(true);
    expect(agentsApi.getDefaultAgent).toHaveBeenCalledTimes(1);
  });
});
