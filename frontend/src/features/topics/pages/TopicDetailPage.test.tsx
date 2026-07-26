import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { queryKeys } from "../../../shared/lib/query-keys";
import type { TopicDetail } from "../types/topic";
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
const topicId = "topic-11111111-1111-4111-8111-111111111111";
const detail: TopicDetail = {
  confidence: 0.86,
  created_at: "2026-07-20T00:00:00Z",
  current_state: "Planning next quarter",
  members: [
    {
      created_at: "2026-07-23T00:00:00Z",
      evidence_count: 2,
      member_id: "chunk-1",
      member_type: "chunk",
      metadata: { text: "Customer evidence" },
      relevance_score: 0.92,
    },
    {
      created_at: "2026-07-23T00:00:00Z",
      evidence_count: 1,
      member_id: "doc-1",
      member_type: "document",
      metadata: { document_type: "pdf", title: "Roadmap" },
      relevance_score: 0.81,
    },
  ],
  name: "Product strategy",
  parent_topic_id: null,
  slug: "product-strategy",
  status: "active",
  summary: "Direction and positioning",
  topic_id: topicId,
  type: "domain",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

function renderDetail(path = `/dashboard/topics/${topicId}`) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/dashboard/topics", element: <p>Topics list destination</p> },
      { path: "/dashboard/topics/:id", element: <TopicDetailPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { queryClient, router };
}

describe("TopicDetailPage", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.getTopic.mockResolvedValue(detail);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
  });

  it("loads detail by route, switches evidence tabs, and navigates back", async () => {
    const user = userEvent.setup();
    renderDetail("/dashboard/topics/product-strategy");

    expect(
      await screen.findByRole("heading", { name: "Product strategy" }),
    ).toBeInTheDocument();
    expect(runtimeApi.getTopic).toHaveBeenCalledWith(
      workspaceId,
      "product-strategy",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Customer evidence")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic metadata")).toHaveTextContent("Active");
    await user.click(screen.getByRole("tab", { name: /source documents/i }));
    expect(screen.getByText("Roadmap")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /back to topics/i }));
    expect(await screen.findByText("Topics list destination")).toBeInTheDocument();
  });

  it("validates inline edits and archives a topic through the typed update", async () => {
    const user = userEvent.setup();
    runtimeApi.updateTopic.mockResolvedValue({
      name: "Market strategy",
      slug: "market-strategy",
      status: "archived",
      topic_id: topicId,
      workspace_id: workspaceId,
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const name = screen.getByRole("textbox", { name: /topic name/i });
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText(/enter a topic name/i)).toBeInTheDocument();
    expect(runtimeApi.updateTopic).not.toHaveBeenCalled();

    await user.type(name, "Market strategy");
    await user.selectOptions(
      screen.getByRole("combobox", { name: /topic status/i }),
      "archived",
    );
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(runtimeApi.updateTopic).toHaveBeenCalledWith(workspaceId, topicId, {
        name: "Market strategy",
        status: "archived",
      }),
    );
  });

  it("moves a renamed slug route to the stable topic ID", async () => {
    const user = userEvent.setup();
    runtimeApi.getTopic
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        ...detail,
        name: "Market strategy",
        slug: "market-strategy",
      });
    runtimeApi.updateTopic.mockResolvedValue({
      name: "Market strategy",
      slug: "market-strategy",
      status: "active",
      topic_id: topicId,
      workspace_id: workspaceId,
    });
    renderDetail("/dashboard/topics/product-strategy");
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const name = screen.getByRole("textbox", { name: /topic name/i });
    await user.clear(name);
    await user.type(name, "Market strategy");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(runtimeApi.getTopic).toHaveBeenCalledWith(workspaceId, topicId),
    );
  });

  it("preserves an edit draft while the topic refetches", async () => {
    const user = userEvent.setup();
    runtimeApi.getTopic
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({ ...detail, summary: "Refreshed summary" });
    const { queryClient } = renderDetail();
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    const name = screen.getByRole("textbox", { name: /topic name/i });
    await user.clear(name);
    await user.type(name, "Working draft");
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.topicDetail(workspaceId, topicId),
      });
    });
    await waitFor(() => expect(runtimeApi.getTopic).toHaveBeenCalledTimes(2));

    expect(name).toHaveValue("Working draft");
  });

  it("disables conflicting actions while re-summarization is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest: ((value: boolean) => void) | undefined;
    runtimeApi.reSummarizeTopic.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderDetail();
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /re-summarize/i }));
    expect(
      await screen.findByRole("button", { name: /requesting summary/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeDisabled();
    expect(runtimeApi.reSummarizeTopic).toHaveBeenCalledWith(
      workspaceId,
      topicId,
    );
    resolveRequest?.(true);
  });

  it("refreshes a slug-loaded detail after re-summarization", async () => {
    const user = userEvent.setup();
    runtimeApi.reSummarizeTopic.mockResolvedValue(true);
    renderDetail("/dashboard/topics/product-strategy");
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /re-summarize/i }));

    await waitFor(() => expect(runtimeApi.getTopic).toHaveBeenCalledTimes(2));
    expect(runtimeApi.getTopic).toHaveBeenLastCalledWith(
      workspaceId,
      "product-strategy",
    );
  });

  it("reports a successful re-summarization request", async () => {
    const user = userEvent.setup();
    runtimeApi.reSummarizeTopic.mockResolvedValue(true);
    renderDetail();
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /re-summarize/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Summary refresh requested.",
    );
  });

  it("reports when a re-summarization request is not accepted", async () => {
    const user = userEvent.setup();
    runtimeApi.reSummarizeTopic.mockResolvedValue(false);
    renderDetail();
    await screen.findByRole("heading", { name: "Product strategy" });

    await user.click(screen.getByRole("button", { name: /re-summarize/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to request a summary refresh.",
    );
  });

  it("renders a recoverable detail error instead of redirecting", async () => {
    const user = userEvent.setup();
    runtimeApi.getTopic
      .mockRejectedValueOnce(new Error("Topic detail is unavailable."))
      .mockResolvedValueOnce(detail);
    renderDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Topic detail is unavailable.",
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(
      await screen.findByRole("heading", { name: "Product strategy" }),
    ).toBeInTheDocument();
  });
});
