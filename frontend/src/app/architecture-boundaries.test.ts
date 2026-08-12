import { describe, expect, it } from "vitest";

const agentSources = import.meta.glob<string>(
  "../features/agents/**/*.{ts,tsx}",
  { eager: true, import: "default", query: "?raw" },
);

describe("feature boundaries", () => {
  it("keeps chat session and message ownership out of agents", () => {
    const violations: string[] = [];
    for (const [file, source] of Object.entries(agentSources)) {
      if (/ChatSession|ChatMessage|CitationList|useSessions/.test(source)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
