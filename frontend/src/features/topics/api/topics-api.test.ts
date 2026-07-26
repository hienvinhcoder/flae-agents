import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../../core/api/client";
import {
  getTopic,
  listTopics,
  mergeTopics,
  reSummarizeTopic,
  updateTopic,
} from "./topics-api";

const topic = {
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
  workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;

describe("topics API", () => {
  it("preserves list search, status, limit, offset, and cancellation", async () => {
    const request = vi.fn().mockResolvedValue([topic]);
    const signal = new AbortController().signal;

    await expect(
      listTopics(
        topic.workspace_id,
        {
          limit: 10,
          offset: 20,
          query: "product strategy",
          status: "needs_review",
        },
        { request } as ApiClient,
        signal,
      ),
    ).resolves.toEqual([topic]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${topic.workspace_id}/topics?query=product+strategy&status=needs_review&limit=10&offset=20`,
      signal,
      workspaceId: topic.workspace_id,
    });
  });

  it("uses backend pagination defaults when filters are omitted", async () => {
    const request = vi.fn().mockResolvedValue([]);

    await expect(
      listTopics(topic.workspace_id, {}, { request } as ApiClient),
    ).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${topic.workspace_id}/topics?limit=20&offset=0`,
      signal: undefined,
      workspaceId: topic.workspace_id,
    });
  });

  it("loads detail by ID or slug and parses member metadata", async () => {
    const detail = {
      ...topic,
      current_state: "Planning",
      members: [
        {
          created_at: "2026-07-23T00:00:00Z",
          evidence_count: 2,
          member_id: "chunk-1",
          member_type: "chunk",
          metadata: { text: "Customer evidence" },
          relevance_score: 0.92,
        },
      ],
    };
    const backendDetail = { ...detail };
    delete (backendDetail as { evidence_count?: number }).evidence_count;
    const request = vi.fn().mockResolvedValue(backendDetail);

    await expect(
      getTopic(topic.workspace_id, "product-strategy", {
        request,
      } as ApiClient),
    ).resolves.toEqual(backendDetail);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${topic.workspace_id}/topics/product-strategy`,
      workspaceId: topic.workspace_id,
    });
  });

  it("uses the actual reduced update response instead of an untyped full topic", async () => {
    const updated = {
      name: "Market strategy",
      slug: "market-strategy",
      status: "archived",
      topic_id: topic.topic_id,
      workspace_id: topic.workspace_id,
    } as const;
    const request = vi.fn().mockResolvedValue(updated);

    await expect(
      updateTopic(
        topic.workspace_id,
        topic.topic_id,
        { name: "Market strategy", status: "archived" },
        { request } as ApiClient,
      ),
    ).resolves.toEqual(updated);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      body: { name: "Market strategy", status: "archived" },
      method: "PUT",
      path: `/workspaces/${topic.workspace_id}/topics/${topic.topic_id}`,
      workspaceId: topic.workspace_id,
    });
  });

  it("preserves merge and re-summarize boolean responses", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const client = { request } as ApiClient;
    const sourceId = "topic-22222222-2222-4222-8222-222222222222";

    await expect(
      mergeTopics(
        topic.workspace_id,
        { source_topic_ids: [sourceId], target_topic_id: topic.topic_id },
        client,
      ),
    ).resolves.toBe(false);
    await expect(
      reSummarizeTopic(topic.workspace_id, topic.topic_id, client),
    ).resolves.toBe(true);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      body: {
        source_topic_ids: [sourceId],
        target_topic_id: topic.topic_id,
      },
      method: "POST",
      path: `/workspaces/${topic.workspace_id}/topics/merge`,
      workspaceId: topic.workspace_id,
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: {},
      method: "POST",
      path: `/workspaces/${topic.workspace_id}/topics/${topic.topic_id}/re-summarize`,
      workspaceId: topic.workspace_id,
    });
  });

  it("rejects malformed update data with a safe error", async () => {
    const request = vi.fn().mockResolvedValue({
      name: "Private roadmap",
      status: "active",
      topic_id: topic.topic_id,
      workspace_id: topic.workspace_id,
    });
    const error: unknown = await updateTopic(
      topic.workspace_id,
      topic.topic_id,
      { name: "Private roadmap" },
      { request } as ApiClient,
    ).catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      kind: "server",
      message: "The server returned invalid topic update data.",
    });
    expect(String(error)).not.toContain("Private roadmap");
  });
});
