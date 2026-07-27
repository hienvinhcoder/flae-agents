import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { createI18n } from "../../../shared/i18n";
import type { KnowledgeDocumentDetail } from "../types/knowledge";
import { IngestionProgress } from "./IngestionProgress";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

const document: KnowledgeDocumentDetail = {
  chunk_count: 4,
  content_text: null,
  created_at: "2026-07-24T00:00:00Z",
  description: null,
  document_type: "text",
  entity_count: 3,
  error_message: null,
  file_name: "guide.txt",
  file_size: 100,
  gcs_path: null,
  id: "11111111-1111-4111-8111-111111111111",
  mime_type: "text/plain",
  processing_time_seconds: 1.5,
  relation_count: 2,
  status: "completed",
  temporal_workflow_id: null,
  title: "Guide",
  token_usage: null,
  updated_at: "2026-07-24T00:00:00Z",
  uploaded_by: "owner@example.com",
};

describe("IngestionProgress", () => {
  it("localizes metric units and processing time in Vietnamese", () => {
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <IngestionProgress document={document} />
      </I18nextProvider>,
    );

    expect(screen.getByRole("heading", { name: "Thống kê xử lý" })).toBeInTheDocument();
    expect(screen.getByText("4 khối văn bản, 3 thực thể, 2 mối quan hệ")).toBeInTheDocument();
    expect(screen.getByText("Thời gian xử lý 1.5 giây")).toBeInTheDocument();
  });
});
