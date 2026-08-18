import { describe, expect, it } from "vitest";

import { getAgentAvatarColor } from "./agent-avatar-color";

describe("getAgentAvatarColor", () => {
  it.each([
    ["bg-amber-500", "bg-chart-4 text-foreground"],
    ["bg-emerald-500", "bg-chart-2 text-primary-foreground"],
    ["bg-indigo-500", "bg-primary text-foreground"],
    ["bg-purple-500", "bg-chart-5 text-foreground"],
    ["bg-rose-500", "bg-chart-1 text-foreground"],
    ["bg-sky-500", "bg-chart-3 text-primary-foreground"],
  ])("maps the persisted %s value into the design-system palette", (value, expected) => {
    expect(getAgentAvatarColor(value)).toBe(expected);
  });

  it("uses a neutral semantic fallback for unknown legacy values", () => {
    expect(getAgentAvatarColor("bg-blue-500")).toBe("bg-secondary text-foreground");
  });
});
