import { Minus, RefreshCw, Search, Plus } from "lucide-react";

import type { GraphCommandType, RendererNode } from "../types";

interface GraphToolbarProps {
  onCommand: (command: Extract<GraphCommandType, "reset" | "zoom-in" | "zoom-out">) => void;
  onFocusNode: (nodeId: string) => void;
  onSearchChange: (search: string) => void;
  search: string;
  suggestions: readonly RendererNode[];
}

const iconButton =
  "grid min-h-10 min-w-10 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink-secondary transition-colors hover:bg-ui-interactive hover:text-ui-ink";

export function GraphToolbar({
  onCommand,
  onFocusNode,
  onSearchChange,
  search,
  suggestions,
}: GraphToolbarProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <div className="relative min-w-[15rem] flex-1 sm:max-w-md">
        <label className="sr-only" htmlFor="graph-search">Search entities</label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ui-ink-muted" />
        <input
          aria-autocomplete="list"
          aria-controls={suggestions.length ? "graph-search-results" : undefined}
          className="min-h-10 w-full rounded-ui-control border border-ui-line bg-ui-canvas/80 pl-9 pr-3 text-ui-ink placeholder:text-ui-ink-muted"
          id="graph-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search entities"
          type="search"
          value={search}
        />
        {suggestions.length ? (
          <div
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-ui-panel border border-ui-line-strong bg-ui-raised shadow-ui-overlay"
            id="graph-search-results"
            role="listbox"
          >
            {suggestions.map((node) => (
              <button
                aria-label={`${node.name} ${node.type}`}
                className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-ui-divider px-3 py-2 text-left text-ui-ink-secondary last:border-0 hover:bg-ui-interactive hover:text-ui-ink"
                key={node.id}
                onClick={() => onFocusNode(node.id)}
                role="option"
                type="button"
              >
                <span className="truncate font-semibold">{node.name}</span>
                <span className="shrink-0 font-code text-[0.68rem] uppercase text-ui-ink-muted">{node.type || "other"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div aria-label="Graph view controls" className="flex gap-2" role="group">
        <button aria-label="Zoom in" className={iconButton} onClick={() => onCommand("zoom-in")} type="button">
          <Plus aria-hidden className="h-4 w-4" />
        </button>
        <button aria-label="Zoom out" className={iconButton} onClick={() => onCommand("zoom-out")} type="button">
          <Minus aria-hidden className="h-4 w-4" />
        </button>
        <button aria-label="Fit graph" className={iconButton} onClick={() => onCommand("reset")} type="button">
          <RefreshCw aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
