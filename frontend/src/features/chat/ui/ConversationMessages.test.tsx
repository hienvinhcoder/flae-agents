import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "../../agents/types/agent";
import { ConversationMessages } from "./ConversationMessages";

const message: ChatMessage = {
  citations: [], content: "Answer", created_at: "2026-07-24T08:00:00Z", created_by: "assistant",
  id: "33333333-3333-4333-8333-333333333333", role: "assistant",
  session_id: "22222222-2222-4222-8222-222222222222",
};
const baseProps = {
  activeSessionId: message.session_id,
  error: null,
  loading: true,
  messages: [] as ChatMessage[],
  onRetry: vi.fn(),
  status: "idle" as const,
};

function setGeometry(element: HTMLElement, values: { clientHeight: number; scrollHeight: number; scrollTop: number }) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: values.clientHeight },
    scrollHeight: { configurable: true, value: values.scrollHeight },
    scrollTop: { configurable: true, value: values.scrollTop, writable: true },
  });
}

describe("ConversationMessages reading position", () => {
  it("forces the first completed session load to the bottom", () => {
    const { rerender } = render(<ConversationMessages {...baseProps} />);
    const viewport = screen.getByTestId("message-viewport");
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;
    setGeometry(viewport, { clientHeight: 200, scrollHeight: 900, scrollTop: 0 });

    rerender(<ConversationMessages {...baseProps} loading={false} messages={[message]} />);

    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 900 });
  });

  it("auto-scrolls streaming only while the reader remains near the bottom", () => {
    const { rerender } = render(<ConversationMessages {...baseProps} loading={false} messages={[message]} />);
    const viewport = screen.getByTestId("message-viewport");
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;
    setGeometry(viewport, { clientHeight: 200, scrollHeight: 1000, scrollTop: 200 });
    fireEvent.scroll(viewport);
    scrollTo.mockClear();

    rerender(<ConversationMessages {...baseProps} loading={false} messages={[message, { ...message, id: "44444444-4444-4444-8444-444444444444" }]} status="streaming" />);
    expect(scrollTo).not.toHaveBeenCalled();

    viewport.scrollTop = 750;
    fireEvent.scroll(viewport);
    rerender(<ConversationMessages {...baseProps} loading={false} messages={[message, { ...message, id: "55555555-5555-4555-8555-555555555555" }]} status="streaming" />);
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 1000 });
  });
});
