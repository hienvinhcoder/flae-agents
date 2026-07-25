import { z } from "zod";

import {
  agentCreateSchema,
  agentDetailSchema,
  agentUpdateSchema,
  chatMessageSchema,
  chatSessionCreateSchema,
  chatSessionSchema,
  citationSchema,
} from "../schemas/agent-schema";

export type AgentDetail = z.output<typeof agentDetailSchema>;
export type Agent = AgentDetail;
export type AgentCreatePayload = z.input<typeof agentCreateSchema>;
export type AgentUpdatePayload = z.input<typeof agentUpdateSchema>;
export type ChatSession = z.output<typeof chatSessionSchema>;
export type ChatSessionCreatePayload = z.input<typeof chatSessionCreateSchema>;
export type Citation = z.output<typeof citationSchema>;
export type ChatMessage = z.output<typeof chatMessageSchema>;
