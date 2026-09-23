import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FileDropzone } from "./FileDropzone";

const baseProps = {
  accept: ".pdf,.md,.txt",
  clearLabel: "Remove file",
  dropLabel: "Drop file here or click to browse",
  file: undefined as File | undefined,
  id: "knowledge-file",
  label: "Document file",
  maxSizeLabel: "Max size 50 MB",
  onClear: vi.fn(),
  onFileChange: vi.fn(),
  typeChips: ["PDF", "MD", "TXT"] as const,
};

describe("FileDropzone", () => {
  it("calls onFileChange when a file is chosen via the input", async () => {
    const onFileChange = vi.fn();
    const user = userEvent.setup();
    render(<FileDropzone {...baseProps} onFileChange={onFileChange} />);
    const file = new File(["hello"], "guide.md", { type: "text/markdown" });
    await user.upload(screen.getByLabelText("Document file"), file);
    expect(onFileChange).toHaveBeenCalledWith(file);
  });

  it("shows type chips and max size helper", () => {
    render(<FileDropzone {...baseProps} />);
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("MD")).toBeInTheDocument();
    expect(screen.getByText("TXT")).toBeInTheDocument();
    expect(screen.getByText("Max size 50 MB")).toBeInTheDocument();
  });

  it("shows a removable chip when a file is selected", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    const file = new File(["hello"], "guide.md", { type: "text/markdown" });
    render(<FileDropzone {...baseProps} file={file} onClear={onClear} />);
    expect(screen.getByText("guide.md")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove file" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("blocks input when disabled", async () => {
    const onFileChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FileDropzone {...baseProps} disabled onFileChange={onFileChange} />,
    );
    const input = screen.getByLabelText("Document file");
    expect(input).toBeDisabled();
    const file = new File(["hello"], "guide.md", { type: "text/markdown" });
    await user.upload(input, file);
    expect(onFileChange).not.toHaveBeenCalled();
  });

  it("renders error with correct id", () => {
    const errorMessage = "File size is too large";
    render(<FileDropzone {...baseProps} error={errorMessage} />);
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveAttribute("id", "knowledge-file-error");
  });

  it("calls onFileChange when file is dropped", () => {
    const onFileChange = vi.fn();
    render(<FileDropzone {...baseProps} onFileChange={onFileChange} />);
    const file = new File(["hello"], "guide.md", { type: "text/markdown" });
    const dropzone = screen
      .getByText("Drop file here or click to browse")
      .closest("div");
    const dataTransfer = { files: [file] };
    fireEvent.drop(dropzone!, { dataTransfer });
    expect(onFileChange).toHaveBeenCalledWith(file);
  });
});
