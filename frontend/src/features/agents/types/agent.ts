import { z } from "zod";

import {
  agentCreateSchema,
  agentDetailSchema,
  agentUpdateSchema,
} from "../schemas/agent-schema";

export type AgentDetail = z.output<typeof agentDetailSchema>;
export type Agent = AgentDetail;
export type AgentCreatePayload = z.input<typeof agentCreateSchema>;
export type AgentUpdatePayload = z.input<typeof agentUpdateSchema>;
