import { describe, expect, it } from "vitest";

import { topicEditSchema, topicMergeSchema } from "./topic-schema";

describe("topic validation", () => {
  it("requires and trims an editable topic name", () => {
    expect(
      topicEditSchema.safeParse({ name: "   ", status: "active" }).success,
    ).toBe(false);
    expect(
      topicEditSchema.parse({ name: "  Market strategy  ", status: "archived" }),
    ).toEqual({ name: "Market strategy", status: "archived" });
  });

  it("requires a merge target and at least one different source", () => {
    expect(
      topicMergeSchema.safeParse({ source_topic_ids: [], target_topic_id: "" })
        .success,
    ).toBe(false);
    expect(
      topicMergeSchema.safeParse({
        source_topic_ids: ["topic-1"],
        target_topic_id: "topic-1",
      }).success,
    ).toBe(false);
    expect(
      topicMergeSchema.parse({
        source_topic_ids: ["topic-2"],
        target_topic_id: "topic-1",
      }),
    ).toEqual({
      source_topic_ids: ["topic-2"],
      target_topic_id: "topic-1",
    });
  });
});
