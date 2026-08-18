import { describe, expect, it } from "vitest";

import {
  createManualDocumentSchema,
  createUploadDocumentSchema,
  manualDocumentSchema,
  uploadDocumentSchema,
} from "./knowledge-schema";

const vietnameseMessages = {
  contentRequired: "Nhập nội dung tài liệu.",
  descriptionMax: "Mô tả không được vượt quá 1.000 ký tự.",
  fileMaxSize: "Dung lượng tài liệu không được vượt quá 50 MB.",
  fileRequired: "Chọn một tài liệu.",
  fileUnsupported: "Chọn tài liệu PDF, Markdown hoặc văn bản.",
  titleMax: "Tiêu đề không được vượt quá 500 ký tự.",
  titleRequired: "Nhập tiêu đề tài liệu.",
};

describe("knowledge document validation", () => {
  it("accepts supported documents up to 50 MB", () => {
    const file = new File(["# Knowledge"], "guide.md", {
      type: "text/markdown",
    });

    expect(
      uploadDocumentSchema.parse({
        description: "Reference guide",
        file,
        title: "Guide",
      }),
    ).toMatchObject({ file, title: "Guide" });
  });

  it("rejects unsupported document types and files larger than 50 MB", () => {
    const unsupported = new File(["binary"], "archive.zip", {
      type: "application/zip",
    });
    const oversized = new File(["content"], "large.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversized, "size", { value: 50 * 1024 * 1024 + 1 });

    expect(
      uploadDocumentSchema.safeParse({ file: unsupported, title: "Archive" })
        .success,
    ).toBe(false);
    expect(
      uploadDocumentSchema.safeParse({ file: oversized, title: "Large PDF" })
        .success,
    ).toBe(false);
  });

  it("requires meaningful manual titles and content", () => {
    expect(
      manualDocumentSchema.safeParse({
        content_text: "   ",
        description: "",
        title: " ",
      }).success,
    ).toBe(false);
    expect(
      manualDocumentSchema.parse({
        content_text: "  Durable knowledge  ",
        description: " Notes ",
        title: " Team handbook ",
      }),
    ).toEqual({
      content_text: "Durable knowledge",
      description: "Notes",
      title: "Team handbook",
    });
  });

  it("uses caller-provided Vietnamese validation messages", () => {
    const uploadSchema = createUploadDocumentSchema(vietnameseMessages);
    const manualSchema = createManualDocumentSchema(vietnameseMessages);
    const unsupported = new File(["binary"], "archive.zip", {
      type: "application/zip",
    });
    const oversized = new File(["content"], "large.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversized, "size", { value: 50 * 1024 * 1024 + 1 });

    expect(
      uploadSchema.safeParse({ title: "Guide" }).error?.issues[0]?.message,
    ).toBe(vietnameseMessages.fileRequired);
    expect(
      uploadSchema.safeParse({ file: unsupported, title: "Archive" }).error
        ?.issues[0]?.message,
    ).toBe(vietnameseMessages.fileUnsupported);
    expect(
      uploadSchema.safeParse({ file: oversized, title: "Large" }).error
        ?.issues[0]?.message,
    ).toBe(vietnameseMessages.fileMaxSize);
    expect(
      uploadSchema.safeParse({ file: unsupported, title: "" }).error?.issues
        .some((issue) => issue.message === vietnameseMessages.titleRequired),
    ).toBe(true);
    expect(
      manualSchema.safeParse({ content_text: "", title: "Guide" }).error
        ?.issues[0]?.message,
    ).toBe(vietnameseMessages.contentRequired);
    expect(
      manualSchema.safeParse({ content_text: "Content", title: "x".repeat(501) })
        .error?.issues[0]?.message,
    ).toBe(vietnameseMessages.titleMax);
    expect(
      manualSchema.safeParse({
        content_text: "Content",
        description: "x".repeat(1_001),
        title: "Guide",
      }).error?.issues[0]?.message,
    ).toBe(vietnameseMessages.descriptionMax);
  });
});
