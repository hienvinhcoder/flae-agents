import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { Topic } from "../types/topic";
import { TopicListPage } from "./TopicListPage";

const runtimeApi = vi.hoisted(() => ({
  getTopic: vi.fn(),
  listTopics: vi.fn(),
  mergeTopics: vi.fn(),
  reSummarizeTopic: vi.fn(),
  updateTopic: vi.fn(),
}));

vi.mock("../api/topics-runtime-api", () => runtimeApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const productTopic: Topic = {
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
const marketTopic: Topic = {
  ...productTopic,
  confidence: 0.72,
  evidence_count: 5,
  name: "Market signals",
  slug: "market-signals",
  status: "needs_review",
  summary: "Customer and competitor evidence",
  topic_id: "topic-22222222-2222-4222-8222-222222222222",
  type: "topic",
};

function TopicDestination() {
  const { id } = useParams();
  return <p>Topic destination {id}</p>;
}

function renderList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/dashboard/topics", element: <TopicListPage /> },
      { path: "/dashboard/topics/:id", element: <TopicDestination /> },
    ],
    { initialEntries: ["/dashboard/topics"] },
  );
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </TestI18nProvider>,
  );
  return { queryClient, router };
}

describe("TopicListPage", () => {
  beforeEach(() => {
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.listTopics.mockResolvedValue([productTopic, marketTopic]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
  });

  it("renders topic cards and navigates to detail by topic ID", async () => {
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByText("Product strategy")).toBeInTheDocument();
    expect(screen.getByText("Market signals")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /product strategy/i }));
    expect(
      await screen.findByText(`Topic destination ${productTopic.topic_id}`),
    ).toBeInTheDocument();
  });

  it("exposes search and status controls in a labeled topic toolbar", async () => {
    renderList();

    const toolbar = await screen.findByRole("toolbar", {
      name: /topic filters/i,
    });
    expect(toolbar).toContainElement(
      screen.getByRole("searchbox", { name: /search topics/i }),
    );
    expect(
      screen.getByRole("combobox", { name: /topic status/i }),
    ).toBeInTheDocument();
  });

  it("requires a workspace before listing topics", () => {
    useWorkspaceStore.getState().reset();
    renderList();

    expect(
      screen.getByText(
        "Select a workspace before reviewing knowledge topics.",
      ),
    ).toBeInTheDocument();
    expect(runtimeApi.listTopics).not.toHaveBeenCalled();
  });

  it("sends debounced search, status, and pagination to the backend", async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 12 }, (_, index) => ({
      ...productTopic,
      name: `Topic ${index + 1}`,
      slug: `topic-${index + 1}`,
      topic_id: `topic-page-${index + 1}`,
    }));
    runtimeApi.listTopics.mockResolvedValue(firstPage);
    renderList();
    await screen.findByText("Topic 1");

    await user.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() =>
      expect(runtimeApi.listTopics).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({ limit: 12, offset: 12 }),
        expect.any(AbortSignal),
      ),
    );

    await user.type(
      screen.getByRole("searchbox", { name: /search topics/i }),
      "market",
    );
    await waitFor(() =>
      expect(runtimeApi.listTopics).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({ offset: 0, query: "market" }),
        expect.any(AbortSignal),
      ),
    );

    await user.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() =>
      expect(runtimeApi.listTopics).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({ offset: 12, query: "market" }),
        expect.any(AbortSignal),
      ),
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: /topic status/i }),
      "needs_review",
    );
    await waitFor(() =>
      expect(runtimeApi.listTopics).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({
          offset: 0,
          query: "market",
          status: "needs_review",
        }),
        expect.any(AbortSignal),
      ),
    );

  });

  it("lets users return from an empty trailing page", async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 12 }, (_, index) => ({
      ...productTopic,
      name: `Topic ${index + 1}`,
      slug: `topic-${index + 1}`,
      topic_id: `topic-page-${index + 1}`,
    }));
    runtimeApi.listTopics
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(firstPage);
    renderList();
    await screen.findByText("Topic 1");

    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(await screen.findByText("No topics found")).toBeInTheDocument();
    const previous = screen.getByRole("button", { name: /previous page/i });
    expect(previous).toBeEnabled();

    await user.click(previous);
    expect(await screen.findByText("Topic 1")).toBeInTheDocument();
  });

  it("keeps merge selections after an error and closes only after success", async () => {
    const user = userEvent.setup();
    runtimeApi.mergeTopics
      .mockRejectedValueOnce(new Error("Unable to merge topics."))
      .mockResolvedValueOnce(true);
    renderList();
    await screen.findByText("Product strategy");

    await user.click(screen.getByRole("button", { name: /merge topics/i }));
    const confirm = screen.getByRole("button", { name: /^merge$/i });
    expect(confirm).toBeDisabled();
    await user.selectOptions(
      screen.getByRole("combobox", { name: /target topic/i }),
      productTopic.topic_id,
    );
    const source = screen.getByRole("checkbox", { name: /market signals/i });
    await user.click(source);
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to merge topics.",
    );
    expect(source).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: /target topic/i }),
    ).toHaveValue(productTopic.topic_id);

    await user.click(screen.getByRole("button", { name: /^merge$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /merge duplicate topics/i })).not.toBeInTheDocument(),
    );
    expect(runtimeApi.mergeTopics).toHaveBeenLastCalledWith(workspaceId, {
      source_topic_ids: [marketTopic.topic_id],
      target_topic_id: productTopic.topic_id,
    });
  });

  it("keeps a pending merge dialog locked until the request settles", async () => {
    const user = userEvent.setup();
    let resolveMerge: ((value: boolean) => void) | undefined;
    runtimeApi.mergeTopics.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveMerge = resolve;
        }),
    );
    renderList();
    await screen.findByText("Product strategy");

    await user.click(screen.getByRole("button", { name: /merge topics/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /target topic/i }),
      productTopic.topic_id,
    );
    await user.click(screen.getByRole("checkbox", { name: /market signals/i }));
    await user.click(screen.getByRole("button", { name: /^merge$/i }));
    expect(await screen.findByRole("button", { name: /merging/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /merge topics/i })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: /target topic/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: /market signals/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /close dialog/i }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: /merge duplicate topics/i }),
    ).toBeInTheDocument();

    act(() => resolveMerge?.(true));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /merge duplicate topics/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("renders a retryable list error", async () => {
    const user = userEvent.setup();
    runtimeApi.listTopics
      .mockRejectedValueOnce(new Error("Topics are temporarily unavailable."))
      .mockResolvedValueOnce([productTopic]);
    renderList();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Topics are temporarily unavailable.",
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Product strategy")).toBeInTheDocument();
  });
});
