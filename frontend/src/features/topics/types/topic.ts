import { z } from "zod";

export const topicTypeSchema = z.enum(["domain", "topic", "subtopic"]);
export const topicStatusSchema = z.enum([
  "active",
  "archived",
  "needs_review",
]);
export const topicMemberTypeSchema = z.enum([
  "chunk",
  "document",
  "entity",
  "relationship",
  "fact",
  "code_symbol",
  "stale_doc_finding",
]);

const topicBaseSchema = z.object({
  confidence: z.number().min(0).max(1),
  created_at: z.string().min(1),
  name: z.string().min(1),
  parent_topic_id: z.string().nullable(),
  slug: z.string().min(1),
  status: topicStatusSchema,
  summary: z.string().nullable(),
  topic_id: z.string().min(1),
  type: topicTypeSchema,
  updated_at: z.string().min(1),
  workspace_id: z.uuid(),
});

export const topicSchema = topicBaseSchema.extend({
  evidence_count: z.number().int().min(0),
});

export const topicMemberSchema = z.object({
  created_at: z.string().min(1),
  evidence_count: z.number().int().min(0),
  member_id: z.string().min(1),
  member_type: topicMemberTypeSchema,
  metadata: z.record(z.string(), z.unknown()),
  relevance_score: z.number().min(0),
});

export const topicDetailSchema = topicBaseSchema.extend({
  current_state: z.string().nullable(),
  members: topicMemberSchema.array(),
});

export const topicUpdateResponseSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  status: topicStatusSchema,
  topic_id: z.string().min(1),
  workspace_id: z.uuid(),
});

export type TopicType = z.infer<typeof topicTypeSchema>;
export type TopicStatus = z.infer<typeof topicStatusSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type TopicMember = z.infer<typeof topicMemberSchema>;
export type TopicDetail = z.infer<typeof topicDetailSchema>;
export type TopicUpdateResponse = z.infer<typeof topicUpdateResponseSchema>;

export interface TopicListParams {
  limit?: number;
  offset?: number;
  query?: string;
  status?: TopicStatus;
}

export interface TopicUpdatePayload {
  confidence?: number;
  current_state?: string | null;
  name?: string;
  parent_topic_id?: string | null;
  status?: TopicStatus;
  summary?: string | null;
}

export interface TopicMergePayload {
  source_topic_ids: string[];
  target_topic_id: string;
}
