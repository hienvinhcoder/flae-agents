import { z } from "zod";

const isoTimestampSchema = z.iso.datetime({ offset: true });

const agentConfigurationSchema = z.object({
  avatar_color: z.string().min(1),
  avatar_icon: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  system_prompt: z.string().trim().min(1),
});

export const agentCreateSchema = agentConfigurationSchema.extend({
  is_default: z.boolean().default(false),
  model_name: z.string().min(1).default("gemini-2.5-flash"),
  temperature: z.number().min(0).max(2).default(0.2),
});

export const agentUpdateSchema = z.object({
  avatar_color: z.string().min(1).optional(),
  avatar_icon: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  model_name: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  system_prompt: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const agentDetailSchema = agentCreateSchema.extend({
  created_at: isoTimestampSchema,
  created_by: z.string().min(1),
  id: z.uuid(),
  is_active: z.boolean(),
  updated_at: isoTimestampSchema,
  workspace_id: z.uuid(),
});

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
