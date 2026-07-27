import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

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
});
