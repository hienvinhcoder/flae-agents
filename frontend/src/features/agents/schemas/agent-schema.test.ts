import { describe, expect, it } from "vitest";

import {
  agentCreateSchema,
  agentDetailSchema,
  chatMessageSchema,
  createAgentCreateSchema,
} from "./agent-schema";

const agent = {
  avatar_color: "bg-blue-500",
  avatar_icon: "bot",
  created_at: "2026-07-20T00:00:00Z",
  created_by: "user-1",
  id: "11111111-1111-4111-8111-111111111111",
  is_active: true,
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "Research assistant",
  system_prompt: "Answer from workspace sources.",
  temperature: 0.2,
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

describe("agent schemas", () => {
  it("accepts the complete backend agent contract", () => {
    expect(agentDetailSchema.parse(agent)).toEqual(agent);
  });

  it("applies create defaults while enforcing required configuration", () => {
    expect(
      agentCreateSchema.parse({
        avatar_color: "bg-blue-500",
        avatar_icon: "bot",
        name: "Research assistant",
        system_prompt: "Answer from workspace sources.",
      }),
    ).toEqual({
      avatar_color: "bg-blue-500",
      avatar_icon: "bot",
      is_default: false,
      model_name: "gemini-2.5-flash",
      name: "Research assistant",
      system_prompt: "Answer from workspace sources.",
      temperature: 0.2,
    });
    expect(
      agentCreateSchema.safeParse({
        avatar_color: "bg-blue-500",
        avatar_icon: "bot",
        name: "",
        system_prompt: "",
        temperature: 3,
      }).success,
    ).toBe(false);
  });

  it("supports localized required, maximum, and temperature range messages", () => {
    const schema = createAgentCreateSchema({
      avatarColorRequired: "color required",
      avatarIconRequired: "icon required",
      modelRequired: "model required",
      nameMax: "name max",
      nameRequired: "name required",
      systemPromptRequired: "prompt required",
      temperatureMax: "temperature max",
      temperatureMin: "temperature min",
    });
    const result = schema.safeParse({
      avatar_color: "",
      avatar_icon: "",
      model_name: "",
      name: "x".repeat(256),
      system_prompt: "",
      temperature: 3,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      "color required",
      "icon required",
      "name max",
      "prompt required",
      "model required",
      "temperature max",
    ]);
    const belowRange = schema.safeParse({
      avatar_color: "bg-blue-500",
      avatar_icon: "bot",
      name: "Research assistant",
      system_prompt: "Use workspace sources.",
      temperature: -1,
    });
    expect(belowRange.success).toBe(false);
    if (!belowRange.success) {
      expect(belowRange.error.issues.map((issue) => issue.message)).toContain("temperature min");
    }
  });

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
      citations: [
        {
          content: "Quoted text",
          score: "high",
          source_document: "Product brief",
        },
      ],
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
