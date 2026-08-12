import { describe, expect, it } from "vitest";

import { chatMessageSchema } from "./chat-schema";

describe("chat schemas", () => {
  it("normalizes nullable citations to an empty typed array", () => {
    const message = chatMessageSchema.parse({
      citations: null,
      content: "A grounded answer.",
      created_at: "2026-07-24T00:00:00Z",
      created_by: "assistant",
      id: "33333333-3333-4333-8333-333333333333",
      role: "assistant",
      session_id: "22222222-2222-4222-8222-222222222222",
    });

    expect(message.citations).toEqual([]);
  });

  it("rejects malformed known message and citation fields", () => {
    const malformedCitation = chatMessageSchema.safeParse({
      citations: [{
        content: "Quoted text",
        score: "high",
        source_document: "Product brief",
      }],
      content: "A grounded answer.",
      created_at: "2026-07-24T00:00:00Z",
      created_by: "assistant",
      id: "33333333-3333-4333-8333-333333333333",
      role: "assistant",
      session_id: "22222222-2222-4222-8222-222222222222",
    });
    const malformedRole = chatMessageSchema.safeParse({
      citations: [],
      content: "Internal note",
      created_at: "not-an-iso-date",
      created_by: "system",
      id: "33333333-3333-4333-8333-333333333333",
      role: "system",
      session_id: "22222222-2222-4222-8222-222222222222",
    });

    expect(malformedCitation.success).toBe(false);
    expect(malformedRole.success).toBe(false);
  });
});
