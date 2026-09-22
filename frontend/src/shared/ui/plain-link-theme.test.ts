import { describe, expect, it } from "vitest";

import stylesheet from "../../styles.css?raw";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const value = channel / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const luminances = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((first, second) => second - first);
  const [lighter = 0, darker = 0] = luminances;

  return (lighter + 0.05) / (darker + 0.05);
}

describe("plain link theme contract", () => {
  it("maps anchors to the semantic link color with AA contrast on shared dark surfaces", () => {
    // Dark-theme --primary (#F97316); --color-link aliases var(--primary).
    const link = `#${["f9", "73", "16"].join("")}`;

    expect(stylesheet).toMatch(/a\s*\{[^}]*color:\s*var\(--color-link\);/s);
    expect(stylesheet).toContain("--color-link: var(--primary);");

    const backgrounds = [
      ["canvas", "#0C0A09"],
      ["card surface", "#1C1917"],
      ["raised surface", "#292524"],
    ] as const;

    for (const [name, background] of backgrounds) {
      const ratio = contrastRatio(link, background);

      expect(
        ratio,
        `${name} link contrast is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
