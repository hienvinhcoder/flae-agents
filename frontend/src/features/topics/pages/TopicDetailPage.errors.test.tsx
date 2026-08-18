import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../app/providers/AppProviders";
import { AppError } from "../../../core/api/errors";
import { apiFailureLifecycle } from "../../../core/api/failure-lifecycle";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
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
vi.mock("../../../core/auth/AuthBootstrap", () => ({
  AuthBootstrap: ({ children }: PropsWithChildren) => children,
}));

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const topicId = "topic-11111111-1111-4111-8111-111111111111";
const detail: TopicDetail = {
  confidence: 0.86,
  created_at: "2026-07-20T00:00:00Z",
  current_state: "Planning next quarter",
  members: [],
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

function serverError(message: string) {
  return new AppError({
    kind: "server",
    message,
    retryable: false,
    status: 503,
  });
}

function renderWithAppProviders() {
  const router = createMemoryRouter(
    [{ path: "/dashboard/topics/:id", element: <TopicDetailPage /> }],
    { initialEntries: [`/dashboard/topics/${topicId}`] },
  );
  render(
    <TestI18nProvider>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </TestI18nProvider>,
  );
}

describe("TopicDetailPage error ownership", () => {
  beforeEach(() => {
    apiFailureLifecycle.reset();
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.getTopic.mockResolvedValue(detail);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
  });

  afterEach(() => apiFailureLifecycle.reset());

  it("uses safe detail copy and lets AppProviders own a 503 query alert", async () => {
    runtimeApi.getTopic.mockRejectedValue(serverError("Raw topic query infrastructure details"));
    renderWithAppProviders();

    act(() => apiFailureLifecycle.reportServerFailure());

    expect(
      await screen.findByRole("heading", { name: "Unable to load topic" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unable to load topic details.")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Raw topic query infrastructure details")).not.toBeInTheDocument();
  });

  it("uses safe save copy and lets AppProviders own a 503 update alert", async () => {
    const user = userEvent.setup();
    runtimeApi.updateTopic.mockRejectedValue(serverError("Raw topic update infrastructure details"));
    renderWithAppProviders();
    await screen.findByRole("heading", { name: "Product strategy" });
    await user.click(screen.getByRole("button", { name: "Edit topic" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Error saving changes.")).toBeInTheDocument();
    act(() => apiFailureLifecycle.reportServerFailure());
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Raw topic update infrastructure details")).not.toBeInTheDocument();
  });

  it("uses safe summary copy and lets AppProviders own a 503 summary alert", async () => {
    const user = userEvent.setup();
    runtimeApi.reSummarizeTopic.mockRejectedValue(
      serverError("Raw topic summary infrastructure details"),
    );
    renderWithAppProviders();
    await screen.findByRole("heading", { name: "Product strategy" });
    await user.click(screen.getByRole("button", { name: "Re-summarize" }));

    expect(
      await screen.findByText("Unable to request a summary refresh."),
    ).toBeInTheDocument();
    act(() => apiFailureLifecycle.reportServerFailure());
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Raw topic summary infrastructure details")).not.toBeInTheDocument();
  });
});
