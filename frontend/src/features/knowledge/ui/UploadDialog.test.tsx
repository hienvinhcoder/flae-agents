import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { createI18n } from "../../../shared/i18n";
import { UploadDialog } from "./UploadDialog";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("UploadDialog", () => {
  it("blocks dismissal and preserves values while submission is pending", async () => {
    const user = userEvent.setup();
    const submission = deferred<void>();
    const onClose = vi.fn();
    const onSubmit = vi.fn(() => submission.promise);
    const dialog = (isSubmitting: boolean) => (
      <TestI18nProvider>
        <UploadDialog
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={onSubmit}
          open
        />
      </TestI18nProvider>
    );
    const { rerender } = render(dialog(false));
    const file = new File(["# Guide"], "guide.md", { type: "text/markdown" });

    await user.upload(screen.getByLabelText(/document file/i), file);
    await user.type(screen.getByLabelText(/document title/i), "Product guide");
    await user.type(screen.getByLabelText(/description/i), "Reference");
    await user.click(screen.getByRole("button", { name: /^upload$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    rerender(dialog(true));

    expect(screen.queryByRole("button", { name: /close dialog/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/document file/i)).toBeDisabled();
    expect(screen.getByLabelText(/document title/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByLabelText(/document title/i)).toHaveValue("Product guide");

    screen.getByRole("dialog", { name: /upload document/i }).focus();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/document title/i)).toHaveValue("Product guide");

    submission.resolve();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(/document file/i)).toHaveValue("");
    expect(screen.getByLabelText(/document title/i)).toHaveValue("");
  });

  it("preserves entered values after submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Upload failed"));
    render(
      <TestI18nProvider>
        <UploadDialog
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          open
        />
      </TestI18nProvider>,
    );

    const file = new File(["# Guide"], "guide.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText(/document file/i), file);
    await user.type(screen.getByLabelText(/document title/i), "Product guide");
    await user.click(screen.getByRole("button", { name: /^upload$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(/document title/i)).toHaveValue("Product guide");
  });

  it("renders controls and required validation in Vietnamese", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <UploadDialog
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          open
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Tải lên tài liệu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng hộp thoại" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tệp tài liệu")).toBeInTheDocument();
    expect(screen.getByLabelText("Tiêu đề tài liệu")).toBeInTheDocument();
    expect(screen.getByLabelText("Mô tả")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Tải lên$/ }));
    expect(await screen.findByText("Chọn một tài liệu.")).toBeInTheDocument();
    expect(screen.getByText("Nhập tiêu đề tài liệu.")).toBeInTheDocument();
  });
});
