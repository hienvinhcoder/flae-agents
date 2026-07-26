import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppError } from "../../../core/api/errors";
import { queryKeys } from "../../../shared/lib/query-keys";
import * as runtimeApi from "../api/topics-runtime-api";
import type {
  TopicListParams,
  TopicMergePayload,
  TopicStatus,
  TopicUpdatePayload,
} from "../types/topic";

const SEARCH_DEBOUNCE_MS = 300;

export interface TopicFilters {
  limit: number;
  offset: number;
  query: string;
  status: "all" | TopicStatus;
}

function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebounced(value),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useTopics(
  workspaceId: string | null,
  filters: TopicFilters,
) {
  const debouncedQuery = useDebouncedValue(filters.query.trim());
  const workspaceKey = workspaceId ?? "none";
  const status = filters.status === "all" ? undefined : filters.status;
  const params: TopicListParams = {
    limit: filters.limit,
    offset: filters.offset,
    query: debouncedQuery || undefined,
    status,
  };
  const query = useQuery({
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      runtimeApi.listTopics(workspaceId as string, params, signal),
    queryKey: queryKeys.topicList(
      workspaceKey,
      debouncedQuery,
      status ?? "all",
      filters.limit,
      filters.offset,
    ),
  });

  return { ...query, debouncedQuery };
}

export function useTopicDetail(
  workspaceId: string | null,
  topicIdOrSlug: string | null,
) {
  return useQuery({
    enabled: Boolean(workspaceId && topicIdOrSlug),
    queryFn: () =>
      runtimeApi.getTopic(
        workspaceId as string,
        topicIdOrSlug as string,
      ),
    queryKey: queryKeys.topicDetail(
      workspaceId ?? "none",
      topicIdOrSlug ?? "none",
    ),
  });
}

function requireTopicId(topicId: string | null) {
  if (!topicId) {
    throw new AppError({
      kind: "validation",
      message: "A topic is required before making this request.",
      retryable: false,
    });
  }
  return topicId;
}

export function useTopicActions(
  workspaceId: string | null,
  topicId: string | null,
  detailIdOrSlug: string | null = topicId,
) {
  const queryClient = useQueryClient();
  const invalidateTopics = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.topics(workspaceId as string),
    });
  const invalidateTopicLists = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.topicLists(workspaceId as string),
    });
  const invalidateDetail = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.topicDetail(
        workspaceId as string,
        requireTopicId(detailIdOrSlug),
      ),
    });

  const update = useMutation({
    mutationFn: (payload: TopicUpdatePayload) =>
      runtimeApi.updateTopic(
        workspaceId as string,
        requireTopicId(topicId),
        payload,
      ),
    onSuccess: async () => {
      const invalidations: Promise<unknown>[] = [invalidateTopicLists()];
      if (detailIdOrSlug === topicId) {
        invalidations.push(invalidateDetail());
      }
      await Promise.all(invalidations);
    },
  });
  const merge = useMutation({
    mutationFn: (payload: TopicMergePayload) =>
      runtimeApi.mergeTopics(workspaceId as string, payload),
    onSuccess: (merged) => (merged ? invalidateTopics() : undefined),
  });
  const reSummarize = useMutation({
    mutationFn: () =>
      runtimeApi.reSummarizeTopic(
        workspaceId as string,
        requireTopicId(topicId),
      ),
    onSuccess: (requested) => (requested ? invalidateDetail() : undefined),
  });

  return { merge, reSummarize, update };
}
