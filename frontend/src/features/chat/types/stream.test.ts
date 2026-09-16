import { describe, expect, it } from "vitest";

import { parseStreamEvent } from "./stream";

describe("parseStreamEvent", () => {
  it.each([
    [{ type: "token", text: "Hello" }],
    [{ name: "search_knowledge", phase: "start", type: "tool" }],
    [{ name: "search_knowledge", phase: "end", type: "tool" }],
    [{ citations: [{ content: "Evidence", score: null, source_document: "Policy.pdf" }], type: "citations" }],
    [{ type: "done" }],
    [{ detail: "The model rejected the request.", type: "error" }],
  ])("accepts a valid event", (event) => {
    expect(parseStreamEvent(event)).toEqual(event);
  });

  it.each([
    [null],
    [{}],
    [{ type: "unknown" }],
    [{ type: "token" }],
    [{ text: 1, type: "token" }],
    [{ citations: null, type: "citations" }],
    [{ citations: [{ content: "Evidence", score: undefined, source_document: "Policy.pdf" }], type: "citations" }],
    [{ extra: true, type: "done" }],
    [{ detail: 5, type: "error" }],
    [{ name: "search_knowledge", phase: "running", type: "tool" }],
    [{ name: "", phase: "start", type: "tool" }],
  ])("rejects malformed or unknown events", (event) => {
    expect(() => parseStreamEvent(event)).toThrow(/invalid stream event/i);
  });
});
