import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { createI18n } from "../../../shared/i18n";
import type { KnowledgeDocument } from "../types/knowledge";
import { DocumentTable } from "./DocumentTable";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

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
          emptyMessage="No documents"
          isLoading={false}
          onDelete={vi.fn()}
          onRetry={vi.fn()}
          onView={vi.fn()}
          retryingDocumentIds={new Set()}
        />
      </TestI18nProvider>,
    );

    const mobileDocument = screen.getByRole("article", {
      name: /product guide/i,
    });
    expect(within(mobileDocument).getByText("Completed")).toBeInTheDocument();
    expect(mobileDocument).toHaveTextContent("4 chunks");
  });

  it("formats document dates using the active locale", () => {
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <DocumentTable
          documents={[document]}
          emptyMessage="Không có tài liệu"
          isLoading={false}
          onDelete={vi.fn()}
          onRetry={vi.fn()}
          onView={vi.fn()}
          retryingDocumentIds={new Set()}
        />
      </I18nextProvider>,
    );

    const expectedDate = new Intl.DateTimeFormat("vi").format(
      new Date(document.created_at),
    );
    expect(within(screen.getByRole("table")).getByText(expectedDate)).toBeInTheDocument();
  });

  it("uses the caller-provided filtered empty message", () => {
    render(
      <TestI18nProvider>
        <DocumentTable
          documents={[]}
          emptyMessage="No documents match the current search and status filters."
          isLoading={false}
          onDelete={vi.fn()}
          onRetry={vi.fn()}
          onView={vi.fn()}
          retryingDocumentIds={new Set()}
        />
      </TestI18nProvider>,
    );

    expect(
      screen.getAllByText("No documents match the current search and status filters."),
    ).toHaveLength(2);
  });

  it("localizes the loading state label", () => {
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <DocumentTable
          documents={[]}
          emptyMessage="Không có tài liệu"
          isLoading
          onDelete={vi.fn()}
          onRetry={vi.fn()}
          onView={vi.fn()}
          retryingDocumentIds={new Set()}
        />
      </I18nextProvider>,
    );

    expect(
      screen.getByRole("status", { name: "Đang tải tài liệu tri thức" }),
    ).toBeInTheDocument();
  });
});
