import { describe, expect, it } from "vitest";

import {
  manualDocumentSchema,
  uploadDocumentSchema,
} from "./knowledge-schema";

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
});
