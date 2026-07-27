import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { i18n as I18nInstance } from "i18next";
import type { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { AppProviders } from "../../../app/providers/AppProviders";
import { AppError } from "../../../core/api/errors";
import { apiFailureLifecycle } from "../../../core/api/failure-lifecycle";
import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { createI18n } from "../../../shared/i18n";
import { AgentConfigPage } from "./AgentConfigPage";

const agentsApi = vi.hoisted(() => ({
  createAgent: vi.fn(), deleteAgent: vi.fn(), getAgent: vi.fn(), listAgents: vi.fn(),
  createSession: vi.fn(), deleteSession: vi.fn(), listMessages: vi.fn(), listSessions: vi.fn(), updateAgent: vi.fn(),
}));
const workspaceApi = vi.hoisted(() => ({ listWorkspaceMembers: vi.fn() }));

vi.mock("../api/agents-runtime-api", () => agentsApi);
vi.mock("../../settings/api/workspace-runtime-api", () => workspaceApi);
vi.mock("../../../core/auth/AuthBootstrap", () => ({
  AuthBootstrap: ({ children }: PropsWithChildren) => children,
}));

const workspaceA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const workspaceB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const agentId = "11111111-1111-4111-8111-111111111111";
const userUid = "user-1";

function member(workspaceId: string, role: "admin" | "member" | "owner" | "viewer" = "owner") {
  return {
    avatar_url: null, email: "owner@example.com", full_name: "Owner", role, status: "active",
    user_uid: userUid, workspace_id: workspaceId,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function renderPage({
  appProviders = false,
  i18n,
  path = "/dashboard/agents/new",
}: {
  appProviders?: boolean;
  i18n?: I18nInstance;
  path?: string;
} = {}) {
  const liveI18n = i18n ?? await createI18n(
    { en: { translation: en }, vi: { translation: viMessages } },
    "en",
  );
  const router = createMemoryRouter(
    [
      { path: "/dashboard/agents", element: <p>Agent list destination</p> },
      { path: "/dashboard/agents/new", element: <AgentConfigPage /> },
      { path: "/dashboard/agents/:agentId/edit", element: <AgentConfigPage /> },
    ],
    { initialEntries: [path] },
  );
  const page = <RouterProvider router={router} />;
  render(
    <I18nextProvider i18n={liveI18n}>
      {appProviders ? (
        <AppProviders>{page}</AppProviders>
      ) : (
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          {page}
        </QueryClientProvider>
      )}
    </I18nextProvider>,
  );
  return { i18n: liveI18n, router };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Agent name" }), "Operations guide");
  await user.type(screen.getByRole("textbox", { name: "System prompt" }), "Answer operational questions.");
}

function appError(kind: "auth" | "network" | "server" | "validation", status?: number) {
  return new AppError({
    kind,
    message: "Raw infrastructure details",
    retryable: kind === "network" || kind === "server",
    status,
  });
}

describe("AgentConfigPage quality regressions", () => {
  beforeEach(() => {
    apiFailureLifecycle.reset();
    vi.restoreAllMocks();
    Object.values(agentsApi).forEach((mock) => mock.mockReset());
    workspaceApi.listWorkspaceMembers.mockReset().mockResolvedValue([member(workspaceA)]);
    agentsApi.createAgent.mockResolvedValue({ id: agentId });
    agentsApi.getAgent.mockResolvedValue({
      avatar_color: "bg-rose-500", avatar_icon: "sparkles", created_at: "2026-07-20T00:00:00Z", created_by: userUid,
      id: agentId, is_active: true, is_default: false, model_name: "gemini-1.5-pro", name: "Policy guide",
      system_prompt: "Use only approved policy documents.", temperature: 0.7, updated_at: "2026-07-24T00:00:00Z", workspace_id: workspaceA,
    });
    agentsApi.updateAgent.mockResolvedValue({ id: agentId });
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceA);
    useWorkspaceStore.getState().setSelectionInitialized(true);
    useAuthStore.getState().setAuthenticated({
      avatar_url: null, current_workspace_id: workspaceA, email: "owner@example.com", firebase_uid: userUid,
      full_name: "Owner", id: "profile-1", is_active: true, login_providers: ["email_password"],
    });
  });

  afterEach(() => apiFailureLifecycle.reset());

  it("does not mount or submit the create form before authorization resolves", async () => {
    const roleRequest = deferred<ReturnType<typeof member>[]>();
    workspaceApi.listWorkspaceMembers.mockReturnValueOnce(roleRequest.promise);
    await renderPage();

    expect(screen.queryByRole("textbox", { name: "Agent name" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create agent" })).not.toBeInTheDocument();
    expect(agentsApi.createAgent).not.toHaveBeenCalled();

    roleRequest.resolve([member(workspaceA, "member")]);
    expect(await screen.findByText("Agent list destination")).toBeInTheDocument();
    expect(agentsApi.createAgent).not.toHaveBeenCalled();
  });

  it("does not load or mount the edit form before authorization resolves", async () => {
    const roleRequest = deferred<ReturnType<typeof member>[]>();
    workspaceApi.listWorkspaceMembers.mockReturnValueOnce(roleRequest.promise);
    await renderPage({ path: `/dashboard/agents/${agentId}/edit` });

    expect(screen.queryByRole("textbox", { name: "Agent name" })).not.toBeInTheDocument();
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
    expect(agentsApi.updateAgent).not.toHaveBeenCalled();

    roleRequest.resolve([member(workspaceA, "viewer")]);
    expect(await screen.findByText("Agent list destination")).toBeInTheDocument();
    expect(agentsApi.getAgent).not.toHaveBeenCalled();
    expect(agentsApi.updateAgent).not.toHaveBeenCalled();
  });

  it("discards a draft when the selected workspace changes", async () => {
    const user = userEvent.setup();
    workspaceApi.listWorkspaceMembers.mockImplementation((workspaceId: string) =>
      Promise.resolve([member(workspaceId)]));
    await renderPage();
    await screen.findByRole("heading", { name: "Create AI agent" });
    await fillRequiredFields(user);

    act(() => useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceB));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Agent name" })).toHaveValue(""));
    expect(screen.getByRole("textbox", { name: "System prompt" })).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    expect(agentsApi.createAgent).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "Agent name" }), "Workspace B guide");
    await user.type(screen.getByRole("textbox", { name: "System prompt" }), "Answer workspace B questions.");
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(agentsApi.createAgent).toHaveBeenCalledWith(
      workspaceB,
      expect.objectContaining({ name: "Workspace B guide", system_prompt: "Answer workspace B questions." }),
    ));
  });

  it("lets AppProviders own a create 503 alert while keeping safe visible copy", async () => {
    const user = userEvent.setup();
    agentsApi.createAgent.mockRejectedValueOnce(appError("server", 503));
    await renderPage({ appProviders: true });
    await screen.findByRole("heading", { name: "Create AI agent" });
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create agent" }));

    const fallback = await screen.findByText("Unable to create agent.");
    expect(fallback).not.toHaveAttribute("role");
    expect(screen.queryByText("Raw infrastructure details")).not.toBeInTheDocument();
    act(() => apiFailureLifecycle.reportServerFailure());
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("lets AppProviders own a save network failure while keeping safe visible copy", async () => {
    const user = userEvent.setup();
    agentsApi.updateAgent.mockRejectedValueOnce(appError("network"));
    await renderPage({ appProviders: true, path: `/dashboard/agents/${agentId}/edit` });
    const name = await screen.findByRole("textbox", { name: "Agent name" });
    await user.clear(name);
    await user.type(name, "Policy partner");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const fallback = await screen.findByText("Unable to save agent.");
    expect(fallback).not.toHaveAttribute("role");
    act(() => apiFailureLifecycle.reportNetworkFailure());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps globally owned 401 failures out of the local live region", async () => {
    const user = userEvent.setup();
    agentsApi.createAgent.mockRejectedValueOnce(appError("auth", 401));
    await renderPage();
    await screen.findByRole("heading", { name: "Create AI agent" });
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create agent" }));

    expect(await screen.findByText("Unable to create agent.")).not.toHaveAttribute("role");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("updates a locally owned submit error when the language changes", async () => {
    const user = userEvent.setup();
    agentsApi.createAgent.mockRejectedValueOnce(appError("validation", 422));
    const { i18n } = await renderPage();
    await screen.findByRole("heading", { name: "Create AI agent" });
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to create agent.");

    await act(async () => i18n.changeLanguage("vi"));
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể tạo trợ lý.");
  });

  it("revalidates visible Zod errors in Vietnamese after a live language switch", async () => {
    const user = userEvent.setup();
    const { i18n } = await renderPage();
    await screen.findByRole("heading", { name: "Create AI agent" });
    await user.click(screen.getByRole("button", { name: "Create agent" }));
    expect(await screen.findByText("Enter an agent name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a system prompt.")).toBeInTheDocument();

    await act(async () => i18n.changeLanguage("vi"));
    expect(await screen.findByText("Nhập tên trợ lý.")).toBeInTheDocument();
    expect(screen.getByText("Nhập hướng dẫn hệ thống.")).toBeInTheDocument();
    expect(screen.queryByText("Enter an agent name.")).not.toBeInTheDocument();
  });

  it("does not submit an empty edit update", async () => {
    const user = userEvent.setup();
    await renderPage({ path: `/dashboard/agents/${agentId}/edit` });

    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    await user.click(save);
    expect(agentsApi.updateAgent).not.toHaveBeenCalled();
  });

  it("defines exact, parity-safe EN and VI validation dictionaries", () => {
    expect(en.AGENT_VALIDATION).toEqual({
      AVATAR_COLOR_REQUIRED: "Select an avatar color.",
      AVATAR_ICON_REQUIRED: "Select an avatar icon.",
      MODEL_REQUIRED: "Select an AI model.",
      NAME_MAX: "Agent name must be 255 characters or fewer.",
      NAME_REQUIRED: "Enter an agent name.",
      SYSTEM_PROMPT_REQUIRED: "Enter a system prompt.",
      TEMPERATURE_MAX: "Temperature must be 2 or lower.",
      TEMPERATURE_MIN: "Temperature must be 0 or higher.",
    });
    expect(viMessages.AGENT_VALIDATION).toEqual({
      AVATAR_COLOR_REQUIRED: "Chọn màu đại diện.",
      AVATAR_ICON_REQUIRED: "Chọn biểu tượng đại diện.",
      MODEL_REQUIRED: "Chọn mô hình AI.",
      NAME_MAX: "Tên trợ lý không được vượt quá 255 ký tự.",
      NAME_REQUIRED: "Nhập tên trợ lý.",
      SYSTEM_PROMPT_REQUIRED: "Nhập hướng dẫn hệ thống.",
      TEMPERATURE_MAX: "Độ sáng tạo không được lớn hơn 2.",
      TEMPERATURE_MIN: "Độ sáng tạo không được nhỏ hơn 0.",
    });
    expect(Object.keys(en.AGENT_VALIDATION)).toEqual(Object.keys(viMessages.AGENT_VALIDATION));
  });
});
