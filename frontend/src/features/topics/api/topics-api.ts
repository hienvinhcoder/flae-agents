import type { ApiClient, JsonValue } from "../../../core/api/client";
import { AppError } from "../../../core/api/errors";
import {
  topicDetailSchema,
  topicSchema,
  topicUpdateResponseSchema,
  type Topic,
  type TopicDetail,
  type TopicListParams,
  type TopicMergePayload,
  type TopicUpdatePayload,
  type TopicUpdateResponse,
} from "../types/topic";

function requireWorkspaceId(workspaceId: string | null) {
  if (!workspaceId?.trim()) {
    throw new AppError({
      kind: "validation",
      message: "A workspace is required before making this request.",
      retryable: false,
    });
  }
  return workspaceId;
}

function invalidData(message: string) {
  return new AppError({ kind: "server", message, retryable: false });
}

function topicPath(workspaceId: string) {
  return `/workspaces/${workspaceId}/topics`;
}

export async function listTopics(
  workspaceId: string | null,
  params: TopicListParams,
  client: ApiClient,
  signal?: AbortSignal,
): Promise<Topic[]> {
  const id = requireWorkspaceId(workspaceId);
  const search = new URLSearchParams();
  const query = params.query?.trim();
  if (query) search.set("query", query);
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit ?? 20));
  search.set("offset", String(params.offset ?? 0));
  const result = topicSchema.array().safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${topicPath(id)}?${search.toString()}`,
      signal,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid topic list data.");
  }
  return result.data;
}

export async function getTopic(
  workspaceId: string | null,
  topicIdOrSlug: string,
  client: ApiClient,
): Promise<TopicDetail> {
  const id = requireWorkspaceId(workspaceId);
  const result = topicDetailSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      method: "GET",
      path: `${topicPath(id)}/${encodeURIComponent(topicIdOrSlug)}`,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid topic detail data.");
  }
  return result.data;
}

export async function updateTopic(
  workspaceId: string | null,
  topicId: string,
  payload: TopicUpdatePayload,
  client: ApiClient,
): Promise<TopicUpdateResponse> {
  const id = requireWorkspaceId(workspaceId);
  const body: Record<string, JsonValue> = {};
  if (payload.confidence !== undefined) body.confidence = payload.confidence;
  if (payload.current_state !== undefined) body.current_state = payload.current_state;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.parent_topic_id !== undefined) body.parent_topic_id = payload.parent_topic_id;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.summary !== undefined) body.summary = payload.summary;
  const result = topicUpdateResponseSchema.safeParse(
    await client.request<unknown>({
      auth: true,
      body,
      method: "PUT",
      path: `${topicPath(id)}/${encodeURIComponent(topicId)}`,
      workspaceId: id,
    }),
  );
  if (!result.success) {
    throw invalidData("The server returned invalid topic update data.");
  }
  return result.data;
}

export async function mergeTopics(
  workspaceId: string | null,
  payload: TopicMergePayload,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const result = await client.request<unknown>({
    auth: true,
    body: {
      source_topic_ids: payload.source_topic_ids,
      target_topic_id: payload.target_topic_id,
    },
    method: "POST",
    path: `${topicPath(id)}/merge`,
    workspaceId: id,
  });
  if (typeof result !== "boolean") {
    throw invalidData("The server returned invalid topic merge data.");
  }
  return result;
}

export async function reSummarizeTopic(
  workspaceId: string | null,
  topicId: string,
  client: ApiClient,
): Promise<boolean> {
  const id = requireWorkspaceId(workspaceId);
  const result = await client.request<unknown>({
    auth: true,
    body: {},
    method: "POST",
    path: `${topicPath(id)}/${encodeURIComponent(topicId)}/re-summarize`,
    workspaceId: id,
  });
  if (typeof result !== "boolean") {
    throw invalidData("The server returned invalid re-summarization data.");
  }
  return result;
}
