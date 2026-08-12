import type { ApiClient, JsonValue } from "../../../core/api/client";
import { AppError } from "../../../core/api/errors";
import { agentCreateSchema, agentDetailSchema, agentUpdateSchema } from "../schemas/agent-schema";
import type {
  AgentCreatePayload,
  AgentDetail,
  AgentUpdatePayload,
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

export async function getDefaultAgent(
  workspaceId: string | null,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<AgentDetail> {
  const id = requireWorkspaceId(workspaceId);
  return parseAgent(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${agentsPath(id)}/default`,
      signal,
      workspaceId: id,
    }),
    "The server returned invalid default agent data.",
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
