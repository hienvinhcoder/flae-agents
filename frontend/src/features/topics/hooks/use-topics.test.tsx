import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../../../shared/lib/query-keys";
import type { Topic, TopicDetail } from "../types/topic";
import {
  useTopicActions,
  useTopicDetail,
  useTopics,
} from "./use-topics";

const runtimeApi = vi.hoisted(() => ({
  getTopic: vi.fn(),
  listTopics: vi.fn(),
  mergeTopics: vi.fn(),
  reSummarizeTopic: vi.fn(),
  updateTopic: vi.fn(),
}));

vi.mock("../api/topics-runtime-api", () => runtimeApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const topic: Topic = {
  confidence: 0.86,
  created_at: "2026-07-20T00:00:00Z",
  evidence_count: 12,
  name: "Product strategy",
  parent_topic_id: null,
  slug: "product-strategy",
  status: "active",
  summary: "Direction and positioning",
  topic_id: "topic-11111111-1111-4111-8111-111111111111",
  type: "domain",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};
const detail: TopicDetail = {
  ...topic,
  current_state: "Planning",
  members: [],
};
delete (detail as Partial<Topic>).evidence_count;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

async function flushQuery() {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("topic queries", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces server search while preserving status and pagination", async () => {
    vi.useFakeTimers();
    runtimeApi.listTopics.mockResolvedValue([topic]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = renderHook(
      ({ query }) =>
        useTopics(workspaceId, {
          limit: 10,
          offset: 20,
          query,
          status: "needs_review",
        }),
      {
        initialProps: { query: "" },
        wrapper: createWrapper(queryClient),
      },
    );
    await flushQuery();
    runtimeApi.listTopics.mockClear();

    rerender({ query: "market" });
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(runtimeApi.listTopics).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await flushQuery();

    expect(runtimeApi.listTopics).toHaveBeenCalledWith(
      workspaceId,
      {
        limit: 10,
        offset: 20,
        query: "market",
        status: "needs_review",
      },
      expect.any(AbortSignal),
    );
  });

  it("aborts the stale search when the debounced query changes", async () => {
    vi.useFakeTimers();
    let firstSignal: AbortSignal | undefined;
    runtimeApi.listTopics.mockImplementation(
      (_workspace: string, params: { query?: string }, signal: AbortSignal) => {
        if (params.query === "first") {
          firstSignal = signal;
          return new Promise(() => undefined);
        }
        return Promise.resolve([]);
      },
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = renderHook(
      ({ query }) =>
        useTopics(workspaceId, {
          limit: 20,
          offset: 0,
          query,
          status: "all",
        }),
      {
        initialProps: { query: "first" },
        wrapper: createWrapper(queryClient),
      },
    );
    await flushQuery();
    expect(firstSignal?.aborted).toBe(false);

    rerender({ query: "second" });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    await flushQuery();

    expect(firstSignal?.aborted).toBe(true);
    expect(runtimeApi.listTopics).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({ query: "second" }),
      expect.any(AbortSignal),
    );
  });

  it("loads detail by ID or slug with a workspace-scoped key", async () => {
    runtimeApi.getTopic.mockResolvedValue(detail);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useTopicDetail(workspaceId, "product-strategy"),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(runtimeApi.getTopic).toHaveBeenCalledWith(
      workspaceId,
      "product-strategy",
    );
    expect(
      queryClient.getQueryData(
        queryKeys.topicDetail(workspaceId, "product-strategy"),
      ),
    ).toEqual(detail);
  });

  it("invalidates list and detail after a typed topic update", async () => {
    runtimeApi.updateTopic.mockResolvedValue({
      name: "Market strategy",
      slug: "market-strategy",
      status: "archived",
      topic_id: topic.topic_id,
      workspace_id: workspaceId,
    });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useTopicActions(workspaceId, topic.topic_id),
      { wrapper: createWrapper(queryClient) },
    );

    await act(() =>
      result.current.update.mutateAsync({
        name: "Market strategy",
        status: "archived",
      }),
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.topicLists(workspaceId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.topicDetail(workspaceId, topic.topic_id),
    });
  });

  it("invalidates merged topics only when the backend reports success", async () => {
    runtimeApi.mergeTopics
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useTopicActions(workspaceId, null),
      { wrapper: createWrapper(queryClient) },
    );
    const payload = {
      source_topic_ids: ["topic-source"],
      target_topic_id: topic.topic_id,
    };

    await act(() => result.current.merge.mutateAsync(payload));
    expect(invalidate).not.toHaveBeenCalled();
    await act(() => result.current.merge.mutateAsync(payload));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.topics(workspaceId),
    });
  });

  it("invalidates detail only after a successful re-summarization request", async () => {
    runtimeApi.reSummarizeTopic.mockResolvedValue(true);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useTopicActions(workspaceId, topic.topic_id),
      { wrapper: createWrapper(queryClient) },
    );

    await act(() => result.current.reSummarize.mutateAsync());

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.topicDetail(workspaceId, topic.topic_id),
    });
  });
});
