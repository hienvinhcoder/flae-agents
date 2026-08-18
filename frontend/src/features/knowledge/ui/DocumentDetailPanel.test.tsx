import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { createI18n } from "../../../shared/i18n";
import type { KnowledgeDocumentDetail } from "../types/knowledge";
import { DocumentDetailPanel } from "./DocumentDetailPanel";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

const document: KnowledgeDocumentDetail = {
  chunk_count: 4,
  content_text: "Nội dung tham chiếu",
  created_at: "2026-07-24T00:00:00Z",
  description: "Hướng dẫn sản phẩm",
  document_type: "manual_input",
  entity_count: 3,
  error_message: null,
  file_name: null,
  file_size: null,
  gcs_path: null,
  id: "11111111-1111-4111-8111-111111111111",
  mime_type: "text/plain",
  processing_time_seconds: 1.5,
  relation_count: 2,
  status: "failed",
  temporal_workflow_id: "workflow-1",
  title: "Hướng dẫn sản phẩm",
  token_usage: null,
  updated_at: "2026-07-24T00:00:00Z",
  uploaded_by: "owner@example.com",
};

function renderPanel(props: Partial<ComponentProps<typeof DocumentDetailPanel>> = {}) {
  render(
    <I18nextProvider i18n={vietnameseI18n}>
      <DocumentDetailPanel
        document={document}
        isDeleting={false}
        isLoading={false}
        isRetrying={false}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onRetry={vi.fn()}
        open
        {...props}
      />
    </I18nextProvider>,
  );
}

describe("DocumentDetailPanel", () => {
  it("localizes document content, metrics, and actions in Vietnamese", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "Đóng hộp thoại" })).toBeInTheDocument();
    expect(screen.getByText("Văn bản nhập thủ công")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nội dung đã trích xuất" })).toBeInTheDocument();
    expect(screen.getByText("4 khối văn bản, 3 thực thể, 2 mối quan hệ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xử lý lại" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa tài liệu" })).toBeInTheDocument();
  });

  it("localizes fallback title, loading label, and load error", () => {
    renderPanel({ document: undefined, error: "Mất kết nối", isLoading: true });

    expect(screen.getByRole("dialog", { name: "Chi tiết tài liệu" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Đang tải chi tiết tài liệu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Không thể tải tài liệu" })).toBeInTheDocument();
  });

  it("localizes retry and delete pending labels", () => {
    renderPanel({ isDeleting: true, isRetrying: true });

    expect(screen.getByRole("button", { name: "Đang xử lý lại" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đang xóa" })).toBeDisabled();
  });
});
