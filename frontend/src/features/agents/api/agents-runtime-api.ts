import { createApiClient } from "../../../core/api/client";
import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import type {
  AgentCreatePayload,
  AgentUpdatePayload,
} from "../types/agent";
import * as agentsApi from "./agents-api";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: getAuthToken,
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
