import type { ApiClient, JsonValue } from "../../../core/api/client";
import { AppError } from "../../../core/api/errors";
import {
  agentCreateSchema,
  agentDetailSchema,
  agentUpdateSchema,
  chatMessageSchema,
  chatSessionCreateSchema,
  chatSessionSchema,
} from "../schemas/agent-schema";
import type {
  AgentCreatePayload,
  AgentDetail,
  AgentUpdatePayload,
  ChatMessage,
  ChatSession,
  ChatSessionCreatePayload,
} from "../types/agent";

function validationError(message: string) {
  return new AppError({ kind: "validation", message, retryable: false });
}

function invalidData(message: string) {
  return new AppError({ kind: "server", message, retryable: false });
}

function requireWorkspaceId(workspaceId: string | null) {
  if (!workspaceId?.trim()) {
    throw validationError("A workspace is required before making this request.");
  }
  return workspaceId;
}

function requireResourceId(value: string, resource: string) {
  if (!value?.trim()) {
    throw validationError(`${resource} is required before making this request.`);
  }
  return encodeURIComponent(value);
}

function agentsPath(workspaceId: string) {
  return `/workspaces/${workspaceId}/agents`;
}

function parseAgent(data: unknown, message: string): AgentDetail {
  const result = agentDetailSchema.safeParse(data);
  if (!result.success) throw invalidData(message);
  return result.data;
}

function toJsonBody(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Record<string, JsonValue>;
}

export async function listAgents(
  workspaceId: string | null,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<AgentDetail[]> {
  const id = requireWorkspaceId(workspaceId);
  const result = agentDetailSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: agentsPath(id),
      signal,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid agent list data.");
  }
  return result.data;
}

export async function getAgent(
  workspaceId: string | null,
  agentId: string,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<AgentDetail> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  return parseAgent(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${agentsPath(id)}/${resourceId}`,
      signal,
      workspaceId: id,
    }),
    "The server returned invalid agent detail data.",
  );
}

export async function createAgent(
  workspaceId: string | null,
  payload: AgentCreatePayload,
  client: ApiClient,
): Promise<AgentDetail> {
  const id = requireWorkspaceId(workspaceId);
  const parsed = agentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw validationError("The agent configuration is invalid.");
  }
  return parseAgent(
    await client.request<unknown>({
      auth: true,
      body: parsed.data,
      method: "POST",
      path: agentsPath(id),
      workspaceId: id,
    }),
    "The server returned invalid agent creation data.",
  );
}

export async function updateAgent(
  workspaceId: string | null,
  agentId: string,
  payload: AgentUpdatePayload,
  client: ApiClient,
): Promise<AgentDetail> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const parsed = agentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw validationError("The agent update is invalid.");
  }
  return parseAgent(
    await client.request<unknown>({
      auth: true,
      body: toJsonBody(parsed.data),
      method: "PUT",
      path: `${agentsPath(id)}/${resourceId}`,
      workspaceId: id,
    }),
    "The server returned invalid agent update data.",
  );
}

export async function deleteAgent(
  workspaceId: string | null,
  agentId: string,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const result = await client.request<unknown>({
    auth: true,
    method: "DELETE",
    path: `${agentsPath(id)}/${resourceId}`,
    workspaceId: id,
  });
  if (typeof result !== "boolean") {
    throw invalidData("The server returned invalid agent deletion data.");
  }
  return result;
}

export async function listSessions(
  workspaceId: string | null,
  agentId: string,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<ChatSession[]> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const result = chatSessionSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${agentsPath(id)}/${resourceId}/sessions`,
      signal,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid chat session data.");
  }
  return result.data;
}

export async function createSession(
  workspaceId: string | null,
  agentId: string,
  payload: ChatSessionCreatePayload = {},
  client: ApiClient,
): Promise<ChatSession> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const parsed = chatSessionCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw validationError("The chat session configuration is invalid.");
  }
  const result = chatSessionSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      body: toJsonBody(parsed.data),
      method: "POST",
      path: `${agentsPath(id)}/${resourceId}/sessions`,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid chat session data.");
  }
  return result.data;
}

export async function deleteSession(
  workspaceId: string | null,
  agentId: string,
  sessionId: string,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const chatSessionId = requireResourceId(sessionId, "A chat session");
  const result = await client.request<unknown>({
    auth: true,
    method: "DELETE",
    path: `${agentsPath(id)}/${resourceId}/sessions/${chatSessionId}`,
    workspaceId: id,
  });
  if (typeof result !== "boolean") {
    throw invalidData("The server returned invalid chat session deletion data.");
  }
  return result;
}

export async function listMessages(
  workspaceId: string | null,
  agentId: string,
  sessionId: string,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const id = requireWorkspaceId(workspaceId);
  const resourceId = requireResourceId(agentId, "An agent");
  const chatSessionId = requireResourceId(sessionId, "A chat session");
  const result = chatMessageSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${agentsPath(id)}/${resourceId}/sessions/${chatSessionId}/messages`,
      signal,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid chat message data.");
  }
  return result.data;
}
