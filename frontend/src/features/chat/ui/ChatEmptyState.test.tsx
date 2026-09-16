import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { ChatEmptyState } from "./ChatEmptyState";

describe("ChatEmptyState", () => {
  it("grounds the empty thread in Company Memory and prompt starters", async () => {
    const user = userEvent.setup();
    const onPromptSelect = vi.fn();
    render(
      <TestI18nProvider>
        <ChatEmptyState agentName="Workspace assistant" onPromptSelect={onPromptSelect} />
      </TestI18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Start with Workspace assistant" })).toBeInTheDocument();
    expect(screen.getByText(/answers are grounded in your company memory/i)).toBeInTheDocument();
    expect(screen.getByText(/this conversation has no messages yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "What changed recently across connected sources?" }));
    expect(onPromptSelect).toHaveBeenCalledWith("What changed recently across connected sources?");
  });
});
