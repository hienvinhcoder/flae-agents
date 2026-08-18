import { Minus, RefreshCw, Search, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { GraphCommandType, RendererNode } from "../types";

interface GraphToolbarProps {
  onCommand: (command: Extract<GraphCommandType, "reset" | "zoom-in" | "zoom-out">) => void;
  onFocusNode: (nodeId: string) => void;
  onSearchChange: (search: string) => void;
  search: string;
  suggestions: readonly RendererNode[];
}

const iconButton =
  "grid min-h-11 min-w-11 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none";

export function GraphToolbar({
  onCommand,
  onFocusNode,
  onSearchChange,
  search,
  suggestions,
}: GraphToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <div className="relative min-w-[15rem] flex-1 sm:max-w-md">
        <label className="sr-only" htmlFor="graph-search">{t("GRAPH.SEARCH_LABEL")}</label>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ui-ink-muted" />
        <input
          aria-autocomplete="list"
          aria-controls={suggestions.length ? "graph-search-results" : undefined}
          className="min-h-11 min-w-11 w-full rounded-ui-control border border-ui-line bg-ui-raised pl-9 pr-3 text-ui-ink shadow-sm transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong focus:border-ui-focus focus:outline-none focus:ring-2 focus:ring-ui-focus/25 motion-reduce:transition-none"
          id="graph-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("GRAPH.SEARCH_PLACEHOLDER")}
          type="search"
          value={search}
        />
        {suggestions.length ? (
          <div
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-[16.5rem] overflow-y-auto rounded-xl border border-ui-line bg-ui-raised/95 backdrop-blur-md shadow-ui-overlay"
            id="graph-search-results"
            role="listbox"
          >
            {suggestions.map((node) => (
              <button
                aria-label={`${node.name} ${node.type}`}
                className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-ui-divider/60 px-4 py-2.5 text-left text-ui-ink-secondary last:border-0 hover:bg-ui-interactive hover:text-ui-ink transition-colors duration-150"
                key={node.id}
                onClick={() => onFocusNode(node.id)}
                role="option"
                type="button"
              >
                <span className="truncate font-semibold text-sm">{node.name}</span>
                <span className="shrink-0 font-code text-[0.65rem] uppercase text-ui-ink-muted tracking-wider bg-ui-canvas/50 px-1.5 py-0.5 rounded border border-ui-divider">{node.type || "-"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div aria-label={t("GRAPH.VIEW_CONTROLS")} className="flex gap-2" role="group">
        <button aria-label={t("GRAPH.ZOOM_IN")} className={iconButton} onClick={() => onCommand("zoom-in")} type="button">
          <Plus aria-hidden className="h-4 w-4" />
        </button>
        <button aria-label={t("GRAPH.ZOOM_OUT")} className={iconButton} onClick={() => onCommand("zoom-out")} type="button">
          <Minus aria-hidden className="h-4 w-4" />
        </button>
        <button aria-label={t("GRAPH.FIT_GRAPH")} className={iconButton} onClick={() => onCommand("reset")} type="button">
          <RefreshCw aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
