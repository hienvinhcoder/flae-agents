import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { KnowledgeReadiness } from "./KnowledgeReadiness";

describe("KnowledgeReadiness", () => {
  it("explains how an empty workspace becomes company memory", () => {
    render(
      <TestI18nProvider>
        <KnowledgeReadiness
          completed={0}
          failed={0}
          onReviewFailed={vi.fn()}
          processing={0}
          total={0}
          totalChunks={0}
        />
      </TestI18nProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Build your company memory",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add durable sources so FLAE can retrieve trusted context for people and agents.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Memory readiness" }),
    ).not.toBeInTheDocument();
  });
});
