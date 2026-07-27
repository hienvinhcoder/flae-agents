import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { AppProviders } from "../../../app/providers/AppProviders";
import { AppError } from "../../../core/api/errors";
import { apiFailureLifecycle } from "../../../core/api/failure-lifecycle";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { createI18n } from "../../../shared/i18n";
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
vi.mock("../../../core/auth/AuthBootstrap", () => ({
  AuthBootstrap: ({ children }: PropsWithChildren) => children,
}));

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);
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
  name: "Market signals",
  slug: "market-signals",
  status: "needs_review",
  topic_id: "topic-22222222-2222-4222-8222-222222222222",
  type: "topic",
};

function renderVietnamesePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <I18nextProvider i18n={vietnameseI18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TopicListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function renderWithAppProviders() {
  render(
    <TestI18nProvider>
      <AppProviders>
        <MemoryRouter>
          <TopicListPage />
        </MemoryRouter>
      </AppProviders>
    </TestI18nProvider>,
  );
}

describe("TopicListPage error ownership", () => {
  beforeEach(() => {
    apiFailureLifecycle.reset();
    Object.values(runtimeApi).forEach((mock) => mock.mockReset());
    runtimeApi.listTopics.mockResolvedValue([productTopic, marketTopic]);
    useWorkspaceStore.getState().reset();
    useWorkspaceStore.getState().setCurrentWorkspaceId(workspaceId);
  });

  afterEach(() => apiFailureLifecycle.reset());

  it("uses Vietnamese public copy instead of a raw query AppError", async () => {
    runtimeApi.listTopics.mockRejectedValueOnce(
      new AppError({
        kind: "validation",
        message: "Raw upstream topic query details",
        retryable: false,
        status: 422,
      }),
    );
    renderVietnamesePage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tải danh sách chủ đề.",
    );
    expect(screen.queryByText("Raw upstream topic query details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("lets AppProviders own the only alert for a 503 topic failure", async () => {
    runtimeApi.listTopics.mockRejectedValue(
      new AppError({
        kind: "server",
        message: "Raw upstream topic outage details",
        retryable: true,
        status: 503,
      }),
    );
    renderWithAppProviders();

    act(() => apiFailureLifecycle.reportServerFailure());
    expect(
      await screen.findByRole("heading", { name: "Unable to load topics list." }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.queryByText("Raw upstream topic outage details")).not.toBeInTheDocument();
  });

  it("uses Vietnamese public copy instead of a raw merge AppError", async () => {
    const user = userEvent.setup();
    runtimeApi.mergeTopics.mockRejectedValueOnce(
      new AppError({
        kind: "validation",
        message: "Raw upstream topic merge details",
        retryable: false,
        status: 422,
      }),
    );
    renderVietnamesePage();
    await screen.findByText("Product strategy");

    await user.click(screen.getByRole("button", { name: /gộp chủ đề/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /chủ đề đích/i }),
      productTopic.topic_id,
    );
    await user.click(screen.getByRole("checkbox", { name: /market signals/i }));
    await user.click(screen.getByRole("button", { name: /^gộp$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lỗi khi thực hiện gộp các chủ đề.",
    );
    expect(screen.queryByText("Raw upstream topic merge details")).not.toBeInTheDocument();
  });
});
