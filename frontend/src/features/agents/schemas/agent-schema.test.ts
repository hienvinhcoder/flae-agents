import { describe, expect, it } from "vitest";

import {
  agentCreateSchema,
  agentDetailSchema,
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

});
