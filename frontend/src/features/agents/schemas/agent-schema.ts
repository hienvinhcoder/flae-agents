import { z } from "zod";

const isoTimestampSchema = z.iso.datetime({ offset: true });

export interface AgentValidationMessages {
  avatarColorRequired: string;
  avatarIconRequired: string;
  modelRequired: string;
  nameMax: string;
  nameRequired: string;
  systemPromptRequired: string;
  temperatureMax: string;
  temperatureMin: string;
}

const defaultAgentValidationMessages: AgentValidationMessages = {
  avatarColorRequired: "Select an avatar color.",
  avatarIconRequired: "Select an avatar icon.",
  modelRequired: "Select an AI model.",
  nameMax: "Agent name must be 255 characters or fewer.",
  nameRequired: "Enter an agent name.",
  systemPromptRequired: "Enter a system prompt.",
  temperatureMax: "Temperature must be 2 or lower.",
  temperatureMin: "Temperature must be 0 or higher.",
};

function createAgentConfigurationSchema(messages: AgentValidationMessages) {
  return z.object({
    avatar_color: z.string().min(1, messages.avatarColorRequired),
    avatar_icon: z.string().min(1, messages.avatarIconRequired),
    name: z.string().trim().min(1, messages.nameRequired).max(255, messages.nameMax),
    system_prompt: z.string().trim().min(1, messages.systemPromptRequired),
  });
}

export function createAgentCreateSchema(messages: AgentValidationMessages) {
  return createAgentConfigurationSchema(messages).extend({
    is_default: z.boolean().default(false),
    model_name: z.string().min(1, messages.modelRequired).default("gemini-2.5-flash"),
    temperature: z
      .number()
      .min(0, messages.temperatureMin)
      .max(2, messages.temperatureMax)
      .default(0.2),
  });
}

export const agentCreateSchema = createAgentCreateSchema(defaultAgentValidationMessages);

export const agentUpdateSchema = z.object({
  avatar_color: z.string().min(1, defaultAgentValidationMessages.avatarColorRequired).optional(),
  avatar_icon: z.string().min(1, defaultAgentValidationMessages.avatarIconRequired).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  model_name: z.string().min(1, defaultAgentValidationMessages.modelRequired).optional(),
  name: z
    .string()
    .trim()
    .min(1, defaultAgentValidationMessages.nameRequired)
    .max(255, defaultAgentValidationMessages.nameMax)
    .optional(),
  system_prompt: z.string().trim().min(1, defaultAgentValidationMessages.systemPromptRequired).optional(),
  temperature: z
    .number()
    .min(0, defaultAgentValidationMessages.temperatureMin)
    .max(2, defaultAgentValidationMessages.temperatureMax)
    .optional(),
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
