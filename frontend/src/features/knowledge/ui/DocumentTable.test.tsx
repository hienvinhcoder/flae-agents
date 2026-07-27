import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import type { KnowledgeDocument } from "../types/knowledge";
import { DocumentTable } from "./DocumentTable";

const document: KnowledgeDocument = {
  chunk_count: 4,
  created_at: "2026-07-24T00:00:00Z",
  description: "Product reference",
  document_type: "markdown",
  entity_count: 3,
  file_name: "guide.md",
  file_size: 2048,
  id: "11111111-1111-4111-8111-111111111111",
  relation_count: 2,
  status: "completed",
  title: "Product guide",
  updated_at: "2026-07-24T00:00:00Z",
  uploaded_by: "user-1",
};

describe("DocumentTable", () => {
  it("renders a labeled mobile document summary for each row", () => {
    render(
      <TestI18nProvider>
        <DocumentTable
          documents={[document]}
          isLoading={false}
          isRetrying={false}
          onDelete={vi.fn()}
          onRetry={vi.fn()}
          onView={vi.fn()}
        />
      </TestI18nProvider>,
    );

    const mobileDocument = screen.getByRole("article", {
      name: /product guide/i,
    });
    expect(within(mobileDocument).getByText("Completed")).toBeInTheDocument();
    expect(mobileDocument).toHaveTextContent("4 chunks");
  });
});
