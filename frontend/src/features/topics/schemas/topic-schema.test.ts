import { describe, expect, it } from "vitest";

import {
  createTopicMergeSchema,
  topicEditSchema,
  topicMergeSchema,
} from "./topic-schema";

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

  it("creates a merge schema with localized Vietnamese validation", () => {
    const messages = {
      "TOPICS.MERGE_SOURCE_REQUIRED": "Chọn ít nhất một chủ đề nguồn.",
      "TOPICS.MERGE_TARGET_REQUIRED": "Chọn một chủ đề đích.",
      "TOPICS.MERGE_TARGET_SOURCE_CONFLICT":
        "Chủ đề đích không thể đồng thời là chủ đề nguồn.",
    } as const;
    const schema = createTopicMergeSchema((key) => messages[key]);

    const sourceRequired = schema.safeParse({
      source_topic_ids: [],
      target_topic_id: "topic-1",
    });
    const targetRequired = schema.safeParse({
      source_topic_ids: ["topic-1"],
      target_topic_id: "",
    });
    const conflict = schema.safeParse({
      source_topic_ids: ["topic-1"],
      target_topic_id: "topic-1",
    });

    expect(sourceRequired.error?.issues[0]?.message).toBe(
      messages["TOPICS.MERGE_SOURCE_REQUIRED"],
    );
    expect(targetRequired.error?.issues[0]?.message).toBe(
      messages["TOPICS.MERGE_TARGET_REQUIRED"],
    );
    expect(conflict.error?.issues[0]?.message).toBe(
      messages["TOPICS.MERGE_TARGET_SOURCE_CONFLICT"],
    );
  });
});
