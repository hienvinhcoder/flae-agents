import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { i18n as I18nInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
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

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const userUid = "user-1";

function renderPage(path = "/dashboard/agents/new", i18n?: I18nInstance) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/dashboard/agents", element: <p>Agent list destination</p> },
      { path: "/dashboard/agents/new", element: <AgentConfigPage /> },
      { path: "/dashboard/agents/:agentId/edit", element: <AgentConfigPage /> },
    ],
    { initialEntries: [path] },
  );
  const page = <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
  render(i18n ? <I18nextProvider i18n={i18n}>{page}</I18nextProvider> : <TestI18nProvider>{page}</TestI18nProvider>);
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

  it("organizes agent configuration into one page heading and semantic sections", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Create AI agent" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const sections = [
      ["Identity", "agent-identity-title"],
      ["Instructions", "agent-instructions-title"],
      ["Model and response", "agent-model-title"],
    ] as const;
    sections.forEach(([name, id]) => {
      const heading = screen.getByRole("heading", { level: 2, name });
      expect(heading).toHaveAttribute("id", id);
      expect(heading.closest("section")).toHaveAttribute("aria-labelledby", id);
    });
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

  it("shows a localized safe error and keeps edits available after a save error", async () => {
    const user = userEvent.setup();
    agentsApi.updateAgent.mockRejectedValueOnce(new Error("Internal persistence details."));
    renderPage(`/dashboard/agents/${agentId}/edit`);

    const name = await screen.findByRole("textbox", { name: /agent name/i });
    await user.clear(name);
    await user.type(name, "Policy partner");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save agent.");
    expect(name).toHaveValue("Policy partner");
  });

  it("shows a localized safe error and keeps form values available after a create error", async () => {
    const user = userEvent.setup();
    agentsApi.createAgent.mockRejectedValueOnce(new Error("Agent creation is temporarily unavailable."));
    renderPage();

    const name = await screen.findByRole("textbox", { name: /agent name/i });
    const systemPrompt = screen.getByRole("textbox", { name: /system prompt/i });
    await user.type(name, "Operations guide");
    await user.type(systemPrompt, "Answer operational questions.");
    await user.click(screen.getByRole("button", { name: /^create agent$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to create agent.");
    expect(name).toHaveValue("Operations guide");
    expect(systemPrompt).toHaveValue("Answer operational questions.");
  });

  it("communicates the selected avatar appearance without relying on color", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("heading", { name: "Create AI agent" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Avatar color" }), "bg-emerald-500");
    await user.selectOptions(screen.getByRole("combobox", { name: "Avatar icon" }), "database");

    const preview = screen.getByRole("group", { name: "Avatar color: Emerald; Avatar icon: Database" });
    expect(within(preview).getByText("Emerald")).toBeInTheDocument();
    expect(within(preview).getByText("Database")).toBeInTheDocument();
  });

  it("associates model guidance and keeps form actions touch-sized and sticky", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Create AI agent" });
    const model = screen.getByRole("combobox", { name: "AI model" });
    const hint = screen.getByText("Choose the model that best matches the agent's latency and reasoning needs.");
    expect(model).toHaveAccessibleDescription(hint.textContent ?? "");

    const cancel = screen.getByRole("link", { name: "Cancel" });
    const create = screen.getByRole("button", { name: "Create agent" });
    expect(cancel).toHaveClass("min-h-11");
    expect(create).toHaveClass("min-h-11");
    const actions = create.parentElement;
    expect(actions).toHaveClass("sticky", "bottom-3", "flex-wrap");
  });

  it("renders the complete Vietnamese configuration vocabulary", async () => {
    const viI18n = await createI18n(
      { en: { translation: en }, vi: { translation: viMessages } },
      "vi",
    );
    renderPage("/dashboard/agents/new", viI18n);

    expect(await screen.findByRole("heading", { level: 1, name: "Tạo trợ lý AI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Danh tính" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Hướng dẫn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Mô hình và phản hồi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay lại trợ lý AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo trợ lý" })).toBeInTheDocument();
  });

  it("defines the exact EN and VI agent configuration dictionaries", () => {
    expect(en.AGENT_CONFIG).toEqual({
      AI_MODEL: "AI model",
      AVATAR_COLOR: "Avatar color",
      AVATAR_ICON: "Avatar icon",
      BACK_TO_AGENTS: "Back to AI agents",
      CANCEL: "Cancel",
      CREATE: "Create agent",
      CREATE_ERROR: "Unable to create agent.",
      CREATE_TITLE: "Create AI agent",
      CREATING: "Creating agent",
      DESCRIPTION: "Define the assistant's identity, instructions, model, and response style.",
      EDIT_TITLE: "Edit AI agent",
      EYEBROW: "Agent configuration",
      IDENTITY_SECTION: "Identity",
      INSTRUCTIONS_SECTION: "Instructions",
      LOADING: "Loading agent configuration",
      MODEL_HINT: "Choose the model that best matches the agent's latency and reasoning needs.",
      MODEL_SECTION: "Model and response",
      NAME: "Agent name",
      NAME_PLACEHOLDER: "Operations guide",
      SAVE: "Save changes",
      SAVE_ERROR: "Unable to save agent.",
      SAVING: "Saving changes",
      SYSTEM_PROMPT: "System prompt",
      SYSTEM_PROMPT_PLACEHOLDER: "Describe the agent's role, boundaries, and expected answers.",
      TEMPERATURE: "Temperature",
      TEMPERATURE_HINT: "Lower is precise; higher is more exploratory.",
    });
    expect(viMessages.AGENT_CONFIG).toEqual({
      AI_MODEL: "Mô hình AI",
      AVATAR_COLOR: "Màu đại diện",
      AVATAR_ICON: "Biểu tượng đại diện",
      BACK_TO_AGENTS: "Quay lại trợ lý AI",
      CANCEL: "Hủy",
      CREATE: "Tạo trợ lý",
      CREATE_ERROR: "Không thể tạo trợ lý.",
      CREATE_TITLE: "Tạo trợ lý AI",
      CREATING: "Đang tạo trợ lý",
      DESCRIPTION: "Xác định danh tính, hướng dẫn, mô hình và phong cách phản hồi của trợ lý.",
      EDIT_TITLE: "Chỉnh sửa trợ lý AI",
      EYEBROW: "Cấu hình trợ lý",
      IDENTITY_SECTION: "Danh tính",
      INSTRUCTIONS_SECTION: "Hướng dẫn",
      LOADING: "Đang tải cấu hình trợ lý",
      MODEL_HINT: "Chọn mô hình phù hợp với nhu cầu về tốc độ phản hồi và khả năng suy luận của trợ lý.",
      MODEL_SECTION: "Mô hình và phản hồi",
      NAME: "Tên trợ lý",
      NAME_PLACEHOLDER: "Trợ lý vận hành",
      SAVE: "Lưu thay đổi",
      SAVE_ERROR: "Không thể lưu trợ lý.",
      SAVING: "Đang lưu thay đổi",
      SYSTEM_PROMPT: "Hướng dẫn hệ thống",
      SYSTEM_PROMPT_PLACEHOLDER: "Mô tả vai trò, giới hạn và cách trả lời mong muốn của trợ lý.",
      TEMPERATURE: "Độ sáng tạo",
      TEMPERATURE_HINT: "Giá trị thấp cho câu trả lời chính xác; giá trị cao tăng khả năng khám phá.",
    });
    expect(Object.keys(en.AGENT_CONFIG)).toEqual(Object.keys(viMessages.AGENT_CONFIG));
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
