import type { RendererEdge } from "./types";

export interface GraphPalette {
  ai: string;
  borderControl: string;
  borderStrong: string;
  danger: string;
  focus: string;
  link: string;
  nodeColors: Readonly<Record<string, string>>;
  primaryActive: string;
  success: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  warning: string;
}

export function resolveGraphPalette(canvas: HTMLCanvasElement): GraphPalette {
  const computedStyle = getComputedStyle(canvas);
  const resolveColor = (token: string, fallback: string) =>
    computedStyle.getPropertyValue(token).trim() || fallback;
  const text = resolveColor("--color-text", computedStyle.color || "CanvasText");
  const textSecondary = resolveColor("--color-text-secondary", text);
  const link = resolveColor("--color-link", text);
  const focus = resolveColor("--color-focus", link);
  const primaryActive = resolveColor(
    "--primary",
    resolveColor("--color-primary", focus),
  );
  const surfaceRaised = resolveColor(
    "--card",
    resolveColor("--color-surface-raised", computedStyle.backgroundColor || "Canvas"),
  );

  return {
    ai: resolveColor("--color-ai", link),
    borderControl: resolveColor("--color-border-control", textSecondary),
    borderStrong: resolveColor("--color-border-strong", text),
    danger: resolveColor("--color-danger", text),
    focus,
    link,
    nodeColors: {
      "var(--chart-1)": resolveColor("--chart-1", primaryActive),
      "var(--chart-2)": resolveColor("--chart-2", primaryActive),
      "var(--chart-3)": resolveColor("--chart-3", primaryActive),
      "var(--chart-4)": resolveColor("--chart-4", primaryActive),
      "var(--chart-5)": resolveColor("--chart-5", primaryActive),
      "var(--primary)": primaryActive,
      "var(--secondary)": resolveColor("--secondary", surfaceRaised),
    },
    primaryActive,
    success: resolveColor("--color-success", text),
    surfaceRaised,
    text,
    textSecondary,
    warning: resolveColor("--color-warning", text),
  };
}

export function resolveNodeColor(color: string, palette: GraphPalette): string {
  return palette.nodeColors[color] ?? color;
}

export function resolveEdgeColor(edge: RendererEdge, palette: GraphPalette) {
  if (edge.tone === "danger") return palette.danger;
  if (edge.tone === "warning") return palette.warning;
  if (edge.tone === "success") return palette.success;
  if (edge.tone === "ai") return palette.ai;
  return palette.borderControl;
}
