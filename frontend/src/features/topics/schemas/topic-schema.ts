import { z } from "zod";

import { topicStatusSchema } from "../types/topic";

export type TopicMergeValidationKey =
  | "TOPICS.MERGE_SOURCE_REQUIRED"
  | "TOPICS.MERGE_TARGET_REQUIRED"
  | "TOPICS.MERGE_TARGET_SOURCE_CONFLICT";

type TopicMergeTranslator = (key: TopicMergeValidationKey) => string;

const defaultTopicMergeMessages: Record<TopicMergeValidationKey, string> = {
  "TOPICS.MERGE_SOURCE_REQUIRED": "Select at least one source topic.",
  "TOPICS.MERGE_TARGET_REQUIRED": "Select a target topic.",
  "TOPICS.MERGE_TARGET_SOURCE_CONFLICT":
    "The target topic cannot also be a source.",
};

export const topicEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a topic name.")
    .max(500, "Topic name must be 500 characters or fewer."),
  status: topicStatusSchema,
});

export function createTopicMergeSchema(t: TopicMergeTranslator) {
  return z
    .object({
      source_topic_ids: z
        .string()
        .min(1)
        .array()
        .min(1, t("TOPICS.MERGE_SOURCE_REQUIRED")),
      target_topic_id: z.string().min(1, t("TOPICS.MERGE_TARGET_REQUIRED")),
    })
    .refine(
      ({ source_topic_ids, target_topic_id }) =>
        !source_topic_ids.includes(target_topic_id),
      {
        message: t("TOPICS.MERGE_TARGET_SOURCE_CONFLICT"),
        path: ["source_topic_ids"],
      },
    );
}

export const topicMergeSchema = createTopicMergeSchema(
  (key) => defaultTopicMergeMessages[key],
);

export type TopicEditForm = z.infer<typeof topicEditSchema>;
export type TopicMergeForm = z.infer<typeof topicMergeSchema>;
