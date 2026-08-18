import { z } from "zod";

const isoTimestampSchema = z.iso.datetime({ offset: true });

export const chatSessionCreateSchema = z.object({
  title: z.string().trim().max(255).optional(),
});

export const chatSessionSchema = z.object({
  agent_id: z.uuid(),
  created_at: isoTimestampSchema,
  created_by: z.string().min(1),
  id: z.uuid(),
  title: z.string(),
  updated_at: isoTimestampSchema,
  workspace_id: z.uuid(),
});

export const citationSchema = z.object({
  content: z.string(),
  score: z.number().optional(),
  source_document: z.string(),
});

export const chatMessageSchema = z.object({
  citations: citationSchema.array().nullable().transform((value) => value ?? []),
  content: z.string(),
  created_at: isoTimestampSchema,
  created_by: z.string().min(1),
  id: z.uuid(),
  role: z.enum(["user", "assistant"]),
  session_id: z.uuid(),
});
