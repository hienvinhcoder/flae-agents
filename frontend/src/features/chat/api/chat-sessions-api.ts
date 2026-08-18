import type { ApiClient, JsonValue } from "../../../core/api/client";
import { AppError } from "../../../core/api/errors";
import {
  chatMessageSchema,
  chatSessionCreateSchema,
  chatSessionSchema,
} from "../schemas/chat-schema";
import type {
  ChatMessage,
  ChatSession,
  ChatSessionCreatePayload,
} from "../types/chat";

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

function toJsonBody(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Record<string, JsonValue>;
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
