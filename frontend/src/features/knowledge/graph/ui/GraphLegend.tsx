import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { RendererNode } from "../types";

interface GraphLegendProps {
  nodes: readonly RendererNode[];
  selectedType: string;
  onSelectType: (type: string) => void;
}

export function GraphLegend({
  nodes,
  selectedType,
  onSelectType,
}: GraphLegendProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);

  // Group nodes by type and grab sample color
  const typeMap = new Map<string, { color: string; count: number }>();
  for (const node of nodes) {
    const typeKey = node.type || "-";
    const existing = typeMap.get(typeKey);
    if (existing) {
      existing.count += 1;
    } else {
      typeMap.set(typeKey, { color: node.color, count: 1 });
    }
  }

  const entries = Array.from(typeMap.entries()).sort((a, b) => b[1].count - a[1].count);

  if (entries.length === 0) return null;

  return (
    <div
      aria-label={t("GRAPH.ENTITY_TYPE")}
      className="pointer-events-auto absolute bottom-4 right-4 z-20 max-w-[18rem] rounded-xl border border-ui-line bg-ui-panel/90 backdrop-blur-md shadow-ui-panel transition-all duration-200"
    >
      <button
        aria-expanded={!collapsed}
        className="flex w-full min-h-9 items-center justify-between gap-3 px-3.5 py-2 text-xs font-semibold text-ui-ink hover:text-brand-text transition-colors"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Layers aria-hidden className="h-3.5 w-3.5 text-brand-text" />
          <span className="font-code text-[0.7rem] uppercase tracking-wider text-ui-ink-secondary">
            {t("GRAPH.ENTITY_TYPE")} ({entries.length})
          </span>
        </div>
        {collapsed ? (
          <ChevronUp aria-hidden className="h-3.5 w-3.5 text-ui-ink-muted" />
        ) : (
          <ChevronDown aria-hidden className="h-3.5 w-3.5 text-ui-ink-muted" />
        )}
      </button>

      {!collapsed && (
        <div className="max-h-48 overflow-y-auto border-t border-ui-divider px-3 py-2 space-y-1">
          <button
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors ${
              selectedType === "all"
                ? "bg-ui-interactive text-brand-text font-bold"
                : "text-ui-ink-secondary hover:bg-ui-interactive/60 hover:text-ui-ink"
            }`}
            onClick={() => onSelectType("all")}
            type="button"
          >
            <span>{t("GRAPH.ALL_ENTITY_TYPES")}</span>
            <span className="font-code text-[0.65rem] text-ui-ink-muted">{nodes.length}</span>
          </button>
          {entries.map(([type, { color, count }]) => {
            const isSelected = selectedType === type;
            return (
              <button
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-ui-interactive text-brand-text font-bold"
                    : "text-ui-ink-secondary hover:bg-ui-interactive/60 hover:text-ui-ink"
                }`}
                key={type}
                onClick={() => onSelectType(isSelected ? "all" : type)}
                type="button"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-left">{type}</span>
                </div>
                <span className="font-code text-[0.65rem] text-ui-ink-muted shrink-0 ml-2">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
