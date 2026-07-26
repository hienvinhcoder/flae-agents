import { z } from "zod";

import { topicStatusSchema } from "../types/topic";

export const topicEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a topic name.")
    .max(500, "Topic name must be 500 characters or fewer."),
  status: topicStatusSchema,
});

export const topicMergeSchema = z
  .object({
    source_topic_ids: z
      .string()
      .min(1)
      .array()
      .min(1, "Select at least one source topic."),
    target_topic_id: z.string().min(1, "Select a target topic."),
  })
  .refine(
    ({ source_topic_ids, target_topic_id }) =>
      !source_topic_ids.includes(target_topic_id),
    {
      message: "The target topic cannot also be a source.",
      path: ["source_topic_ids"],
    },
  );

export type TopicEditForm = z.infer<typeof topicEditSchema>;
export type TopicMergeForm = z.infer<typeof topicMergeSchema>;
