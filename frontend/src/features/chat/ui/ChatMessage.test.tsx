import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { ChatMessage as ChatMessageData } from "../types/chat";
import { ChatMessage } from "./ChatMessage";

const assistantMessage: ChatMessageData = {
  citations: [
    {
      content: "The approved policy applies to all permanent employees.",
      score: 0.91,
      source_document: "People handbook.pdf",
    },
  ],
  content: "The policy applies to permanent employees.",
  created_at: "2026-07-24T08:30:00Z",
  created_by: "assistant",
  id: "22222222-2222-4222-8222-222222222222",
  role: "assistant",
  session_id: "33333333-3333-4333-8333-333333333333",
};

function renderMessage(props: Partial<Parameters<typeof ChatMessage>[0]> = {}) {
  return render(
    <TestI18nProvider>
      <ChatMessage
        message={assistantMessage}
        {...props}
      />
    </TestI18nProvider>,
  );
}

describe("ChatMessage", () => {
  it("shows assistant citations next to the answer", () => {
    renderMessage();

    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
    expect(screen.getByText("People handbook.pdf")).toBeInTheDocument();
    expect(screen.getByText(/91% match/i)).toBeInTheDocument();
  });

  it("renders user messages without citation controls", () => {
    renderMessage({ message: { ...assistantMessage, citations: [], role: "user" } });

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Message citations" })).not.toBeInTheDocument();
  });

  it("announces the live tool status while searching Company Memory", () => {
    renderMessage({
      isLast: true,
      message: { ...assistantMessage, citations: [], content: "" },
      streaming: true,
      toolName: "search_knowledge",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Searching Company Memory");
  });
});
