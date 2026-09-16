import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { CitationList } from "./CitationList";

describe("CitationList", () => {
  it("shows compact source chips and reveals the excerpt on demand", async () => {
    const user = userEvent.setup();
    render(
      <TestI18nProvider>
        <CitationList
          citations={[
            {
              content: "The approved policy applies to all permanent employees.",
              score: 0.91,
              source_document: "People handbook.pdf",
            },
          ]}
        />
      </TestI18nProvider>,
    );

    expect(screen.getByText("People handbook.pdf")).toBeInTheDocument();
    expect(screen.getByText(/91% match/i)).toBeInTheDocument();
    expect(screen.queryByText("The approved policy applies to all permanent employees.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show citation excerpt for People handbook.pdf" }));
    expect(screen.getByText("The approved policy applies to all permanent employees.")).toBeInTheDocument();
  });
});
