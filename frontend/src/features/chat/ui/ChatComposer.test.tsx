import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { ChatComposer } from "./ChatComposer";

function renderComposer(status: "idle" | "connecting" | "streaming" = "idle") {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(
    <TestI18nProvider>
      <ChatComposer agentName="Research guide" onSend={onSend} onStop={onStop} status={status} />
    </TestI18nProvider>,
  );
  return { onSend, onStop };
}

describe("ChatComposer", () => {
  it("sends the typed message with Enter using the approved 40px action", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    await user.type(screen.getByRole("textbox", { name: "Message Research guide" }), "Hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello");
    expect(screen.getByRole("button", { name: "Send message" })).toHaveClass("min-h-10");
  });

  it("keeps Shift+Enter as a newline", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();
    const textbox = screen.getByRole("textbox", { name: "Message Research guide" });

    await user.type(textbox, "First{Shift>}{Enter}{/Shift}Second");

    expect(onSend).not.toHaveBeenCalled();
    expect(textbox).toHaveValue("First\nSecond");
  });

  it("does not submit while an IME composition is active", () => {
    const { onSend } = renderComposer();
    const textbox = screen.getByRole("textbox", { name: "Message Research guide" });
    fireEvent.change(textbox, { target: { value: "Xin chao" } });

    fireEvent.keyDown(textbox, { isComposing: true, key: "Enter" });

    expect(onSend).not.toHaveBeenCalled();
    expect(textbox).toHaveValue("Xin chao");
  });

  it("replaces send with the localized stop action while streaming", async () => {
    const user = userEvent.setup();
    const { onStop } = renderComposer("streaming");

    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop response" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
