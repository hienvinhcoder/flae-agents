import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associates label and validation error", () => {
    render(
      <Textarea
        error="Enter content"
        id="content"
        label="Content"
        placeholder="Paste here"
      />,
    );
    const field = screen.getByRole("textbox", { name: "Content" });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter content");
    expect(field).toHaveClass("min-h-[200px]", "rounded-ui-control");
  });
});
