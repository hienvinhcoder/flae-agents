import { describe, expect, it } from "vitest";

const agentSources = import.meta.glob<string>(
  "../features/agents/**/*.{ts,tsx}",
  { eager: true, import: "default", query: "?raw" },
);
const appSources = import.meta.glob<string>("./**/*.{ts,tsx}", {
  eager: true,
  import: "default",
  query: "?raw",
});

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

  it("keeps agents independent from the chat feature", () => {
    const violations = Object.entries(agentSources)
      .filter(([, source]) => /from\s+["'][^"']*features\/chat|from\s+["']\.\.\/\.\.\/chat\//.test(source))
      .map(([file]) => file);

    expect(violations).toEqual([]);
  });

  it("keeps app bootstrap and layout dependencies acyclic", () => {
    expect(appSources["./App.tsx"]).not.toContain("./router/router");
    expect(appSources["./layout/HeaderUtilities.tsx"]).not.toContain(
      "./AdminHeader",
    );
  });
});
