import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { createI18n } from "../../../shared/i18n";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { Topic } from "../types/topic";
import { TopicCard } from "./TopicCard";

const topic: Topic = {
  confidence: 0.86,
  created_at: "2026-07-24T00:00:00Z",
  evidence_count: 12,
  name: "Product strategy",
  parent_topic_id: null,
  slug: "product-strategy",
  status: "active",
  summary: "Direction and positioning",
  topic_id: "topic-product-strategy",
  type: "domain",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: "workspace-1",
};
const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

describe("TopicCard", () => {
  it("renders type, status, evidence, confidence, and update date without hover-only information", () => {
    render(
      <TestI18nProvider>
        <MemoryRouter>
          <TopicCard topic={topic} />
        </MemoryRouter>
      </TestI18nProvider>,
    );

    const link = screen.getByRole("link", { name: /product strategy/i });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/topics/topic-product-strategy",
    );
    expect(link).toHaveTextContent("Domain");
    expect(link).toHaveTextContent("Active");
    expect(link).toHaveTextContent("12 evidence");
    expect(link).toHaveTextContent("86% confidence");
    expect(link).toHaveTextContent("Updated");
  });

  it("uses concise Vietnamese card copy when a summary is unavailable", () => {
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <MemoryRouter>
          <TopicCard topic={{ ...topic, summary: null }} />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const link = screen.getByRole("link", { name: /product strategy/i });
    expect(link).toHaveTextContent("Chưa có tóm tắt.");
    expect(link).toHaveTextContent("Cập nhật");
  });
});
