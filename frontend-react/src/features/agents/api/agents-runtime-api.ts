import { createApiClient } from "../../../core/api/client";
import { firebaseAuth } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import type {
  AgentCreatePayload,
  AgentUpdatePayload,
  ChatSessionCreatePayload,
} from "../types/agent";
import * as agentsApi from "./agents-api";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: (forceRefresh) =>
    firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? Promise.resolve(null),
});

export const listAgents = (workspaceId: string, signal?: AbortSignal) =>
  agentsApi.listAgents(workspaceId, client, signal);
export const getAgent = (
  workspaceId: string,
  agentId: string,
  signal?: AbortSignal,
) => agentsApi.getAgent(workspaceId, agentId, client, signal);
export const getDefaultAgent = (
  workspaceId: string,
  signal?: AbortSignal,
) => agentsApi.getDefaultAgent(workspaceId, client, signal);
export const createAgent = (
  workspaceId: string,
  payload: AgentCreatePayload,
) => agentsApi.createAgent(workspaceId, payload, client);
export const updateAgent = (
  workspaceId: string,
  agentId: string,
  payload: AgentUpdatePayload,
) => agentsApi.updateAgent(workspaceId, agentId, payload, client);
export const deleteAgent = (workspaceId: string, agentId: string) =>
  agentsApi.deleteAgent(workspaceId, agentId, client);
export const listSessions = (
  workspaceId: string,
  agentId: string,
  signal?: AbortSignal,
) => agentsApi.listSessions(workspaceId, agentId, client, signal);
export const createSession = (
  workspaceId: string,
  agentId: string,
  payload: ChatSessionCreatePayload = {},
) => agentsApi.createSession(workspaceId, agentId, payload, client);
export const deleteSession = (
  workspaceId: string,
  agentId: string,
  sessionId: string,
) => agentsApi.deleteSession(workspaceId, agentId, sessionId, client);
export const listMessages = (
  workspaceId: string,
  agentId: string,
  sessionId: string,
  signal?: AbortSignal,
) => agentsApi.listMessages(workspaceId, agentId, sessionId, client, signal);
