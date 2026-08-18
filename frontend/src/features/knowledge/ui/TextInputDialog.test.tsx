import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../public/assets/i18n/en.json";
import viMessages from "../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../tests/TestI18nProvider";
import { createI18n } from "../../../shared/i18n";
import { TextInputDialog } from "./TextInputDialog";

const vietnameseI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viMessages } },
  "vi",
);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("TextInputDialog", () => {
  it("blocks dismissal and preserves values while submission is pending", async () => {
    const user = userEvent.setup();
    const submission = deferred<void>();
    const onClose = vi.fn();
    const onSubmit = vi.fn(() => submission.promise);
    const dialog = (isSubmitting: boolean) => (
      <TestI18nProvider>
        <TextInputDialog
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={onSubmit}
          open
        />
      </TestI18nProvider>
    );
    const { rerender } = render(dialog(false));

    await user.type(screen.getByLabelText(/document title/i), "Team principles");
    await user.type(screen.getByLabelText(/description/i), "Reference");
    await user.type(screen.getByLabelText(/^content$/i), "Prefer durable decisions.");
    await user.click(screen.getByRole("button", { name: /save content/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    rerender(dialog(true));

    expect(screen.queryByRole("button", { name: /close dialog/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/document title/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/^content$/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    expect(screen.getByLabelText(/^content$/i)).toHaveValue("Prefer durable decisions.");

    screen.getByRole("dialog", { name: /add content/i }).focus();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^content$/i)).toHaveValue("Prefer durable decisions.");

    submission.resolve();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(/^content$/i)).toHaveValue("");
  });

  it("preserves entered values after submission fails", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Save failed"));
    render(
      <TestI18nProvider>
        <TextInputDialog
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          open
        />
      </TestI18nProvider>,
    );

    await user.type(screen.getByLabelText(/document title/i), "Team principles");
    await user.type(screen.getByLabelText(/^content$/i), "Prefer durable decisions.");
    await user.click(screen.getByRole("button", { name: /save content/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(/^content$/i)).toHaveValue("Prefer durable decisions.");
  });

  it("renders controls and required validation in Vietnamese", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={vietnameseI18n}>
        <TextInputDialog
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          open
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Nhập nội dung" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng hộp thoại" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tiêu đề tài liệu")).toBeInTheDocument();
    expect(screen.getByLabelText("Mô tả")).toBeInTheDocument();
    expect(screen.getByLabelText("Nội dung")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    expect(await screen.findByText("Nhập tiêu đề tài liệu.")).toBeInTheDocument();
    expect(screen.getByText("Nhập nội dung tài liệu.")).toBeInTheDocument();
  });
});
