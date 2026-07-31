import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { KnowledgeReadiness } from "./KnowledgeReadiness";

describe("KnowledgeReadiness", () => {
  it("does not render a readiness card for an empty workspace", () => {
    const { container } = render(
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

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("progressbar", { name: "Memory readiness" }),
    ).not.toBeInTheDocument();
  });
});
