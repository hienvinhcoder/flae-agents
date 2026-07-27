import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { AgentDetail } from "../types/agent";
import { AgentCard } from "./AgentCard";

const agent: AgentDetail = {
  avatar_color: "bg-emerald-500",
  avatar_icon: "brain",
  created_at: "2026-07-20T00:00:00Z",
  created_by: "user-1",
  id: "11111111-1111-4111-8111-111111111111",
  is_active: true,
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "Research guide",
  system_prompt: "Answer using workspace evidence.",
  temperature: 0.2,
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

describe("AgentCard", () => {
  it("uses the stable agent ID for chat and management actions", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TestI18nProvider>
        <MemoryRouter>
          <AgentCard agent={agent} canManage onDelete={onDelete} />
        </MemoryRouter>
      </TestI18nProvider>,
    );

    expect(screen.getByText(`Ready on ${agent.model_name}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start conversation.*chat with research guide/i })).toHaveAttribute(
      "href",
      `/dashboard/agents/${agent.id}/chat`,
    );
    expect(screen.getByRole("link", { name: /edit research guide/i })).toHaveAttribute(
      "href",
      `/dashboard/agents/${agent.id}/edit`,
    );
    await user.click(screen.getByRole("button", { name: /delete research guide/i }));
    expect(onDelete).toHaveBeenCalledWith(agent);
  });

  it("hides management actions from members while preserving chat", () => {
    render(
      <TestI18nProvider>
        <MemoryRouter>
          <AgentCard agent={agent} canManage={false} onDelete={vi.fn()} />
        </MemoryRouter>
      </TestI18nProvider>,
    );

    expect(screen.queryByRole("link", { name: /edit research guide/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete research guide/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start conversation.*chat with research guide/i })).toBeInTheDocument();
  });
});
