import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import type { AgentDetail } from "../../agents/types/agent";
import type { ChatSession } from "../types/chat";
import { ChatExperience } from "./ChatExperience";

const agentsApi = vi.hoisted(() => ({
  createSession: vi.fn(), deleteSession: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(),
}));
const chatApi = vi.hoisted(() => ({ streamChat: vi.fn() }));
vi.mock("../api/chat-sessions-runtime-api", () => agentsApi);
vi.mock("../api/chat-api", () => chatApi);

const workspaceOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const workspaceTwo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const agentOne = createAgent("11111111-1111-4111-8111-111111111111", workspaceOne, "First agent");
const agentTwo = createAgent("22222222-2222-4222-8222-222222222222", workspaceTwo, "Second agent");

function createAgent(id: string, workspaceId: string, name: string): AgentDetail {
  return {
    avatar_color: "bg-blue-500", avatar_icon: "bot", created_at: "2026-07-20T00:00:00Z", created_by: "user-1",
    id, is_active: true, is_default: false, model_name: "gemini-2.5-flash", name,
    system_prompt: "Answer with evidence.", temperature: 0.2, updated_at: "2026-07-24T00:00:00Z", workspace_id: workspaceId,
  };
}

function createSession(id: string, workspaceId: string, agentId: string, title: string): ChatSession {
  return {
    agent_id: agentId, created_at: "2026-07-24T08:00:00Z", created_by: "user-1", id, title,
    updated_at: "2026-07-24T08:00:00Z", workspace_id: workspaceId,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function experience(queryClient: QueryClient, workspaceId: string, agent: AgentDetail) {
  return (
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <ChatExperience agent={agent} agentId={agent.id} ariaLabel="Workspace assistant chat" workspaceId={workspaceId} />
      </QueryClientProvider>
    </TestI18nProvider>
  );
}

describe("ChatExperience mutation ownership", () => {
  let sessionsByContext: Map<string, ChatSession[]>;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    chatApi.streamChat.mockReset().mockResolvedValue(undefined);
    sessionsByContext = new Map();
    agentsApi.listSessions.mockImplementation((workspaceId: string, agentId: string) =>
      Promise.resolve(sessionsByContext.get(`${workspaceId}:${agentId}`) ?? []));
    agentsApi.listMessages.mockResolvedValue([]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceOne);
    useWorkspaceStore.getState().setSelectionInitialized(true);
  });

  it("keeps the user's newer selection when an active-session delete resolves", async () => {
    const user = userEvent.setup();
    const pendingDelete = deferred<boolean>();
    const sessionB = createSession("30000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session B");
    const sessionA = createSession("30000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session A");
    const sessionC = createSession("30000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Session C");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionB, sessionA, sessionC]);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await user.click(await screen.findByRole("button", { name: "Session A" }));
    await user.click(screen.getByRole("button", { name: "Delete Session A" }));
    await user.click(screen.getByRole("button", { name: "Session B" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionB, sessionC]);
    act(() => pendingDelete.resolve(true));

    await waitFor(() => expect(screen.getByRole("button", { name: "Session B" })).toHaveAttribute("aria-current", "true"));
  });

  it("selects the originally ordered next session after deleting an active middle session", async () => {
    const user = userEvent.setup();
    const pendingDelete = deferred<boolean>();
    const pendingRefetch = deferred<ChatSession[]>();
    const sessionA = createSession("31000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const sessionB = createSession("31000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session B");
    const sessionC = createSession("31000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Session C");
    agentsApi.listSessions.mockResolvedValueOnce([sessionA, sessionB, sessionC]).mockReturnValueOnce(pendingRefetch.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await user.click(await screen.findByRole("button", { name: "Session B" }));
    await user.click(screen.getByRole("button", { name: "Delete Session B" }));

    act(() => pendingDelete.resolve(true));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Session B" })).not.toBeInTheDocument());
    act(() => pendingRefetch.resolve([sessionA, sessionC]));

    await waitFor(() => expect(screen.getByRole("button", { name: "Session C" })).toHaveAttribute("aria-current", "true"));
  });

  it("selects the previous session after deleting the active last session", async () => {
    const user = userEvent.setup();
    const pendingDelete = deferred<boolean>();
    const pendingRefetch = deferred<ChatSession[]>();
    const sessionA = createSession("32000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const sessionB = createSession("32000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session B");
    const sessionC = createSession("32000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Session C");
    agentsApi.listSessions.mockResolvedValueOnce([sessionA, sessionB, sessionC]).mockReturnValueOnce(pendingRefetch.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await user.click(await screen.findByRole("button", { name: "Session C" }));
    await user.click(screen.getByRole("button", { name: "Delete Session C" }));

    act(() => pendingDelete.resolve(true));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Session C" })).not.toBeInTheDocument());
    act(() => pendingRefetch.resolve([sessionA, sessionB]));

    await waitFor(() => expect(screen.getByRole("button", { name: "Session B" })).toHaveAttribute("aria-current", "true"));
  });

  it("does not let create completion overwrite a newer explicit selection", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const sessionA = createSession("33000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const sessionB = createSession("33000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session B");
    const created = createSession("33000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Created session");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA, sessionB]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await screen.findByRole("button", { name: "Session A" });
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Session B" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [created, sessionA, sessionB]);
    act(() => pendingCreate.resolve(created));

    await waitFor(() => expect(screen.getByRole("button", { name: "New conversation" })).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("button", { name: "Session B" })).toHaveAttribute("aria-current", "true");
  });

  it("keeps a newer created session selected when an older delete completes", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const pendingDelete = deferred<boolean>();
    const sessionA = createSession("35000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const sessionB = createSession("35000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session B");
    const created = createSession("35000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Session C");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA, sessionB]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await screen.findByRole("button", { name: "Session A" });
    await user.click(screen.getByRole("button", { name: "Delete Session A" }));
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [created, sessionA, sessionB]);
    act(() => pendingCreate.resolve(created));
    await waitFor(() => expect(screen.getByRole("button", { name: "Session C" })).toHaveAttribute("aria-current", "true"));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [created, sessionB]);
    act(() => pendingDelete.resolve(true));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Session A" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Session C" })).toHaveAttribute("aria-current", "true");
  });

  it("keeps a newer delete fallback selected when an older create completes", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const pendingDelete = deferred<boolean>();
    const sessionA = createSession("36000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const sessionB = createSession("36000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session B");
    const created = createSession("36000000-0000-4000-8000-000000000003", workspaceOne, agentOne.id, "Session C");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA, sessionB]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await screen.findByRole("button", { name: "Session A" });
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Delete Session A" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionB]);
    act(() => pendingDelete.resolve(true));
    await waitFor(() => expect(screen.getByRole("button", { name: "Session B" })).toHaveAttribute("aria-current", "true"));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [created, sessionB]);
    act(() => pendingCreate.resolve(created));

    await waitFor(() => expect(screen.getByRole("button", { name: "New conversation" })).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("button", { name: "Session B" })).toHaveAttribute("aria-current", "true");
  });

  it("ignores an older mutation error after a newer interaction succeeds", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const pendingDelete = deferred<boolean>();
    const sessionA = createSession("37000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const created = createSession("37000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Session C");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));
    await screen.findByRole("button", { name: "Session A" });
    await user.click(screen.getByRole("button", { name: "Delete Session A" }));
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [created, sessionA]);
    act(() => pendingCreate.resolve(created));
    await waitFor(() => expect(screen.getByRole("button", { name: "Session C" })).toHaveAttribute("aria-current", "true"));

    act(() => pendingDelete.reject(new Error("Raw stale deletion details")));

    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Session A" })).not.toBeDisabled());
    expect(screen.queryByText("The conversation could not be deleted.")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw stale deletion details")).not.toBeInTheDocument();
  });

  it("accepts deferred mutation completion after StrictMode effect replay", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const sessionA = createSession("34000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Session A");
    const created = createSession("34000000-0000-4000-8000-000000000002", workspaceOne, agentOne.id, "Strict created");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne), { reactStrictMode: true });
    await screen.findByRole("button", { name: "Session A" });
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA, created]);
    act(() => pendingCreate.resolve(created));

    await waitFor(() => expect(screen.getByRole("button", { name: "New conversation" })).not.toHaveAttribute("aria-busy"));
    expect(screen.getByRole("button", { name: "Strict created" })).toHaveAttribute("aria-current", "true");
  });

  it("ignores stale create success and delete failure after the chat context changes", async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred<ChatSession>();
    const pendingDelete = deferred<boolean>();
    const sessionA = createSession("40000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Context one");
    const sessionB = createSession("40000000-0000-4000-8000-000000000002", workspaceTwo, agentTwo.id, "Context two primary");
    const staleCreated = createSession("40000000-0000-4000-8000-000000000003", workspaceTwo, agentTwo.id, "Context two secondary");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [sessionA]);
    sessionsByContext.set(`${workspaceTwo}:${agentTwo.id}`, [sessionB, staleCreated]);
    agentsApi.createSession.mockReturnValue(pendingCreate.promise);
    agentsApi.deleteSession.mockReturnValue(pendingDelete.promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(experience(queryClient, workspaceOne, agentOne));
    await screen.findByRole("button", { name: "Context one" });
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(screen.getByRole("button", { name: "Delete Context one" }));

    view.rerender(experience(queryClient, workspaceTwo, agentTwo));
    expect(await screen.findByRole("button", { name: "Context two primary" })).toHaveAttribute("aria-current", "true");
    act(() => {
      pendingCreate.resolve({ ...staleCreated, agent_id: agentOne.id, workspace_id: workspaceOne });
      pendingDelete.reject(new Error("Raw stale deletion details"));
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "Context two primary" })).toHaveAttribute("aria-current", "true"));
    expect(screen.queryByText("The conversation could not be deleted.")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw stale deletion details")).not.toBeInTheDocument();
  });

  it("bounds the desktop workbench and keeps the transcript as the scroll owner", async () => {
    const session = createSession("50000000-0000-4000-8000-000000000001", workspaceOne, agentOne.id, "Layout session");
    sessionsByContext.set(`${workspaceOne}:${agentOne.id}`, [session]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(experience(queryClient, workspaceOne, agentOne));

    const region = await screen.findByRole("region", { name: "Workspace assistant chat" });
    const viewport = screen.getByTestId("message-viewport");
    expect(region).toHaveClass("lg:h-[calc(100dvh-8rem)]", "lg:min-h-[36rem]");
    expect(viewport.parentElement).toHaveClass("h-[calc(100dvh-8rem)]", "min-h-[36rem]", "lg:h-full", "lg:min-h-0");
    expect(viewport).toHaveClass("min-h-0", "overflow-y-auto");
  });
});
