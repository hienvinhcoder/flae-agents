import { createApiClient } from "../../../core/api/client";
import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import type { ChatSessionCreatePayload } from "../types/chat";
import * as chatSessionsApi from "./chat-sessions-api";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: getAuthToken,
});

export const listSessions = (
  workspaceId: string,
  agentId: string,
  signal?: AbortSignal,
) => chatSessionsApi.listSessions(workspaceId, agentId, client, signal);
export const createSession = (
  workspaceId: string,
  agentId: string,
  payload: ChatSessionCreatePayload = {},
) => chatSessionsApi.createSession(workspaceId, agentId, payload, client);
export const deleteSession = (
  workspaceId: string,
  agentId: string,
  sessionId: string,
) => chatSessionsApi.deleteSession(workspaceId, agentId, sessionId, client);
export const listMessages = (
  workspaceId: string,
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
) => chatSessionsApi.listMessages(workspaceId, agentId, sessionId, client, signal);
