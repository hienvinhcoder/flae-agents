import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { TopicDetail, TopicUpdateResponse } from "../types/topic";
import { TopicDetailPage } from "./TopicDetailPage";

const runtimeApi = vi.hoisted(() => ({
  getTopic: vi.fn(),
  listTopics: vi.fn(),
  mergeTopics: vi.fn(),
  reSummarizeTopic: vi.fn(),
  updateTopic: vi.fn(),
}));

vi.mock("../api/topics-runtime-api", () => runtimeApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const topicAId = "topic-11111111-1111-4111-8111-111111111111";
const topicBId = "topic-22222222-2222-4222-8222-222222222222";

const topicA: TopicDetail = {
  confidence: 0.86,
  created_at: "2026-07-20T00:00:00Z",
  current_state: "Planning next quarter",
  members: [],
  name: "Product strategy",
  parent_topic_id: null,
  slug: "product-strategy",
  status: "active",
  summary: "Direction and positioning",
  topic_id: topicAId,
  type: "domain",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

const topicB: TopicDetail = {
  ...topicA,
  name: "Market signals",
  slug: "market-signals",
  topic_id: topicBId,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: "/dashboard/topics/:id", element: <TopicDetailPage /> }],
    { initialEntries: ["/dashboard/topics/product-strategy"] },
  );
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </TestI18nProvider>,
  );
  return router;
}

describe("TopicDetailPage action lifecycle", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.getTopic.mockImplementation(
      (_workspace: string, requestedId: string) =>
        Promise.resolve(requestedId === topicBId ? topicB : topicA),
    );
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
  });

  it("isolates a pending update and ignores its stale stable-ID navigation", async () => {
    const user = userEvent.setup();
    const updateRequest = deferred<TopicUpdateResponse>();
    runtimeApi.updateTopic.mockReturnValue(updateRequest.promise);
    const router = renderDetail();
    await screen.findByRole("heading", { name: topicA.name });

    await user.click(screen.getByRole("button", { name: "Edit topic" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("button", { name: "Saving" })).toBeDisabled();

    await act(async () => router.navigate(`/dashboard/topics/${topicBId}`));

    expect(await screen.findByRole("heading", { name: topicB.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit topic" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Re-summarize" })).toBeEnabled();

    await act(async () => {
      updateRequest.resolve({
        name: topicA.name,
        slug: topicA.slug,
        status: topicA.status,
        topic_id: topicAId,
        workspace_id: workspaceId,
      });
      await updateRequest.promise;
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/dashboard/topics/${topicBId}`);
    });
    expect(screen.getByRole("heading", { name: topicB.name })).toBeInTheDocument();
  });

  it("isolates a pending re-summary request from the next topic", async () => {
    const user = userEvent.setup();
    const summaryRequest = deferred<boolean>();
    runtimeApi.reSummarizeTopic.mockReturnValue(summaryRequest.promise);
    const router = renderDetail();
    await screen.findByRole("heading", { name: topicA.name });

    await user.click(screen.getByRole("button", { name: "Re-summarize" }));
    expect(
      await screen.findByRole("button", { name: "Requesting summary" }),
    ).toBeDisabled();

    await act(async () => router.navigate(`/dashboard/topics/${topicBId}`));

    expect(await screen.findByRole("heading", { name: topicB.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit topic" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Re-summarize" })).toBeEnabled();

    await act(async () => {
      summaryRequest.resolve(true);
      await summaryRequest.promise;
    });

    expect(router.state.location.pathname).toBe(`/dashboard/topics/${topicBId}`);
    expect(screen.getByRole("heading", { name: topicB.name })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
