import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import vi from "../../../../public/assets/i18n/vi.json";
import { createI18n } from "../../../shared/i18n";
import type { DocumentStatus } from "../types/knowledge";
import { StatusBadge } from "./StatusBadge";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: vi } },
  "vi",
);

const localizedStatuses: readonly [DocumentStatus, string][] = [
  ["pending", "Chờ xử lý"],
  ["processing", "Đang xử lý"],
  ["completed", "Hoàn thành"],
  ["failed", "Thất bại"],
];

describe("StatusBadge", () => {
  it("renders every document status in the active language", () => {
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        {localizedStatuses.map(([status]) => (
          <StatusBadge key={status} status={status} />
        ))}
      </I18nextProvider>,
    );

    for (const [, label] of localizedStatuses) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
