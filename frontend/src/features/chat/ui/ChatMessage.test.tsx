import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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

describe("ChatMessage", () => {
  it("reveals assistant citations without hiding the answer", async () => {
    const user = userEvent.setup();
    render(
      <ChatMessage
        agentColor="bg-emerald-500"
        agentIcon="brain"
        message={assistantMessage}
      />,
    );

    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
    expect(screen.queryByText("People handbook.pdf")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show 1 citation/i }));
    expect(screen.getByText("People handbook.pdf")).toBeInTheDocument();
    expect(screen.getByText(/91% match/i)).toBeInTheDocument();
    expect(screen.getByText(assistantMessage.content)).toBeInTheDocument();
  });

  it("renders user messages without citation controls", () => {
    render(
      <ChatMessage
        agentColor="bg-emerald-500"
        agentIcon="brain"
        message={{ ...assistantMessage, citations: [], role: "user" }}
      />,
    );

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /citation/i })).not.toBeInTheDocument();
  });
});
