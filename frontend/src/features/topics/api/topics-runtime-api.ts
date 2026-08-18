import { createApiClient } from "../../../core/api/client";
import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import * as topicsApi from "./topics-api";
import type {
  TopicListParams,
  TopicMergePayload,
  TopicUpdatePayload,
} from "../types/topic";

const client = createApiClient({
  baseUrl: env.VITE_API_URL,
  tokenProvider: getAuthToken,
});

export const listTopics = (
  workspaceId: string,
  params: TopicListParams,
  signal?: AbortSignal,
) => topicsApi.listTopics(workspaceId, params, client, signal);
export const getTopic = (workspaceId: string, topicIdOrSlug: string) =>
  topicsApi.getTopic(workspaceId, topicIdOrSlug, client);
export const updateTopic = (
  workspaceId: string,
  topicId: string,
  payload: TopicUpdatePayload,
) => topicsApi.updateTopic(workspaceId, topicId, payload, client);
export const mergeTopics = (
  workspaceId: string,
  payload: TopicMergePayload,
) => topicsApi.mergeTopics(workspaceId, payload, client);
export const reSummarizeTopic = (workspaceId: string, topicId: string) =>
  topicsApi.reSummarizeTopic(workspaceId, topicId, client);
