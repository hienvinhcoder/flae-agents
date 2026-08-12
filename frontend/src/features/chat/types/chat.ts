import { z } from "zod";

import {
  chatMessageSchema,
  chatSessionCreateSchema,
  chatSessionSchema,
  citationSchema,
} from "../schemas/chat-schema";

export type ChatSession = z.output<typeof chatSessionSchema>;
export type ChatSessionCreatePayload = z.input<typeof chatSessionCreateSchema>;
export type Citation = z.output<typeof citationSchema>;
export type ChatMessage = z.output<typeof chatMessageSchema>;
