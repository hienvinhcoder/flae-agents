import { HelpCircle, Minus, Plus, RefreshCw, Search, X } from "lucide-react";
import { useState } from "react";
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
  "grid min-h-11 min-w-11 place-items-center rounded-xl border border-ui-line/60 bg-ui-raised/80 backdrop-blur-md text-ui-ink-secondary shadow-sm transition-all duration-200 hover:border-ui-line-strong hover:bg-ui-interactive hover:text-ui-ink active:scale-95 motion-reduce:transition-none";

export function GraphToolbar({
  onCommand,
  onFocusNode,
  onSearchChange,
  search,
  suggestions,
}: GraphToolbarProps) {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
      <div className="relative min-w-60 flex-1 sm:max-w-md">
        <label className="sr-only" htmlFor="graph-search">
          {t("GRAPH.SEARCH_LABEL")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-ui-ink-muted transition-colors"
        />
        <input
          aria-autocomplete="list"
          aria-controls={suggestions.length ? "graph-search-results" : undefined}
          className="min-h-11 min-w-11 w-full rounded-xl border border-ui-line/60 bg-ui-raised/80 pl-9 pr-8 text-sm text-ui-ink shadow-sm backdrop-blur-md transition-all duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong focus:border-ui-focus focus:bg-ui-raised focus:outline-none focus:ring-2 focus:ring-ui-focus/25 motion-reduce:transition-none"
          id="graph-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("GRAPH.SEARCH_PLACEHOLDER")}
          type="search"
          value={search}
        />
        {search ? (
          <button
            aria-label={t("COMMON.CANCEL")}
            className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full text-ui-ink-muted transition-colors hover:bg-ui-interactive hover:text-ui-ink"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {suggestions.length ? (
          <div
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-68 overflow-y-auto rounded-xl border border-ui-line bg-ui-raised/95 backdrop-blur-md shadow-ui-overlay animate-in fade-in-50 zoom-in-95 duration-150"
            id="graph-search-results"
            role="listbox"
          >
            {suggestions.map((node) => (
              <button
                aria-label={`${node.name} ${node.type}`}
                className="group flex min-h-11 w-full items-center justify-between gap-3 border-b border-ui-divider/50 px-4 py-2.5 text-left text-ui-ink-secondary last:border-0 hover:bg-ui-interactive hover:text-ui-ink transition-colors duration-150"
                key={node.id}
                onClick={() => onFocusNode(node.id)}
                role="option"
                type="button"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: node.color }}
                  />
                  <span className="truncate font-semibold text-sm group-hover:text-brand-text transition-colors">
                    {node.name}
                  </span>
                </div>
                <span className="shrink-0 font-code text-[0.65rem] uppercase text-ui-ink-muted tracking-wider bg-ui-canvas/60 px-2 py-0.5 rounded-full border border-ui-divider">
                  {node.type || "-"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        aria-label={t("GRAPH.VIEW_CONTROLS")}
        className="flex items-center gap-1 rounded-xl border border-ui-line/40 bg-ui-raised/50 p-1 backdrop-blur-md"
        role="group"
      >
        <button
          aria-label={t("GRAPH.ZOOM_IN")}
          className={iconButton}
          onClick={() => onCommand("zoom-in")}
          title={t("GRAPH.ZOOM_IN")}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={t("GRAPH.ZOOM_OUT")}
          className={iconButton}
          onClick={() => onCommand("zoom-out")}
          title={t("GRAPH.ZOOM_OUT")}
          type="button"
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={t("GRAPH.FIT_GRAPH")}
          className={iconButton}
          onClick={() => onCommand("reset")}
          title={t("GRAPH.FIT_GRAPH")}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="relative">
          <button
            aria-expanded={showHelp}
            aria-label="Shortcuts & Tips"
            className={`${iconButton} ${showHelp ? "bg-ui-interactive text-brand-text" : ""}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Shortcuts"
            type="button"
          >
            <HelpCircle aria-hidden="true" className="h-4 w-4" />
          </button>
          {showHelp ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-ui-line bg-ui-panel/95 p-3.5 text-xs shadow-ui-overlay backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-ui-divider mb-2.5">
                <span className="font-bold text-ui-ink">{t("GRAPH.VIEW_CONTROLS")}</span>
                <button
                  aria-label={t("COMMON.CANCEL")}
                  className="rounded p-1 text-ui-ink-muted hover:text-ui-ink"
                  onClick={() => setShowHelp(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="space-y-1.5 text-ui-ink-secondary font-code text-[0.7rem]">
                <li className="flex justify-between">
                  <span>Pan / Di chuyển</span>
                  <span className="text-ui-ink font-semibold">Drag</span>
                </li>
                <li className="flex justify-between">
                  <span>Zoom / Thu phóng</span>
                  <span className="text-ui-ink font-semibold">Scroll</span>
                </li>
                <li className="flex justify-between">
                  <span>Move node</span>
                  <span className="text-ui-ink font-semibold">Drag node</span>
                </li>
                <li className="flex justify-between">
                  <span>Deselect</span>
                  <span className="text-ui-ink font-semibold">Esc / Click out</span>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
