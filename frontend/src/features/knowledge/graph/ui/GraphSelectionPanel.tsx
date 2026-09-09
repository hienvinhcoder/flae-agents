import { ArrowRight, Crosshair, Network, Share2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RendererEdge, RendererNode } from "../types";

interface GraphSelectionPanelProps {
  neighbors: readonly RendererNode[];
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  selectedEdge: RendererEdge | null;
  selectedNode: RendererNode | null;
}

export function GraphSelectionPanel({
  neighbors,
  onClose,
  onFocusNode,
  selectedEdge,
  selectedNode,
}: GraphSelectionPanelProps) {
  const { t } = useTranslation();
  if (!selectedNode && !selectedEdge) return null;

  return (
    <aside
      aria-label={t(selectedNode ? "GRAPH.ENTITY_DETAILS" : "GRAPH.RELATIONSHIP_DETAILS")}
      className="absolute inset-x-3 bottom-3 z-30 max-h-[60%] overflow-y-auto rounded-2xl border border-ui-line/60 bg-ui-panel/95 shadow-ui-overlay backdrop-blur-xl transition-all duration-200 md:inset-y-3 md:left-auto md:max-h-none md:w-92"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-divider bg-ui-panel/95 px-4.5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-brand-soft text-brand-text">
            {selectedNode ? (
              <Network aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Share2 aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-code text-[0.68rem] font-bold uppercase tracking-[0.14em] text-ui-ink-muted">
            {t(selectedNode ? "GRAPH.ENTITY_DETAILS" : "GRAPH.RELATIONSHIP_DETAILS")}
          </span>
        </div>
        <button
          aria-label={t("GRAPH.CLOSE_DETAILS")}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ui-ink-secondary transition-colors duration-150 hover:bg-ui-interactive hover:text-ui-ink active:scale-95 motion-reduce:transition-none"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>

      {selectedNode ? (
        <div className="grid gap-4.5 p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-code text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-ui-divider bg-ui-canvas/70 flex items-center gap-1.5 shadow-sm"
                style={{ color: selectedNode.color }}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full shadow-sm"
                  style={{ backgroundColor: selectedNode.color }}
                />
                {selectedNode.type || t("GRAPH.ENTITY_TYPE")}
              </span>
              <button
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-ui-line bg-ui-raised/80 px-2.5 py-1 text-xs font-semibold text-ui-ink-secondary transition-colors hover:border-ui-line-strong hover:bg-ui-interactive hover:text-ui-ink active:scale-95"
                onClick={() => onFocusNode(selectedNode.id)}
                type="button"
              >
                <Crosshair aria-hidden="true" className="h-3 w-3 text-brand-text" />
                <span>Focus</span>
              </button>
            </div>
            <h2 className="mt-2.5 text-xl font-bold text-ui-ink tracking-tight wrap-break-word">
              {selectedNode.name}
            </h2>
          </div>

          <div className="rounded-xl border border-ui-divider/80 bg-ui-canvas/50 p-3.5 shadow-inner">
            <span className="font-code text-[0.62rem] uppercase tracking-wider text-ui-ink-muted block mb-1">
              {t("KNOWLEDGE.DESCRIPTION_LABEL")}
            </span>
            <p className="text-sm text-ui-ink-secondary leading-relaxed">
              {selectedNode.description || t("KNOWLEDGE.NO_DESCRIPTION")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 font-code text-xs">
            <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm flex flex-col justify-center items-center">
              <span className="text-[0.65rem] uppercase text-ui-ink-muted tracking-wider mb-0.5">
                Frequency
              </span>
              <span className="font-bold text-sm text-ui-ink">
                {t("GRAPH.FREQUENCY", { value: selectedNode.frequency })}
              </span>
            </div>
            <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm flex flex-col justify-center items-center">
              <span className="text-[0.65rem] uppercase text-ui-ink-muted tracking-wider mb-0.5">
                Connections
              </span>
              <span className="font-bold text-sm text-ui-ink">
                {t("GRAPH.DEGREE", { value: selectedNode.degree })}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-code text-[0.68rem] font-bold uppercase tracking-wider text-ui-ink-muted">
                {t("GRAPH.CONNECTED_ENTITIES", { count: neighbors.length })}
              </h3>
              {neighbors.length > 0 ? (
                <span className="font-code text-[0.62rem] text-ui-ink-muted">
                  {neighbors.length} links
                </span>
              ) : null}
            </div>

            <div className="grid gap-2">
              {neighbors.length ? (
                neighbors.map((neighbor) => (
                  <button
                    aria-label={`${neighbor.name} ${neighbor.type || t("GRAPH.ENTITY_TYPE")}`}
                    className="group flex min-h-11 min-w-11 items-center justify-between gap-3 rounded-xl border border-ui-divider bg-ui-canvas/40 px-3.5 py-2.5 text-left text-sm text-ui-ink-secondary transition-all duration-200 hover:border-ui-line-strong hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
                    key={neighbor.id}
                    onClick={() => onFocusNode(neighbor.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: neighbor.color }}
                      />
                      <span className="truncate font-medium group-hover:text-brand-text transition-colors">
                        {neighbor.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-code text-[0.62rem] uppercase tracking-wider text-ui-ink-muted bg-ui-canvas/70 px-2 py-0.5 rounded-full border border-ui-divider">
                        {neighbor.type || t("GRAPH.ENTITY_TYPE")}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-ui-ink-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
                      />
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-ui-divider bg-ui-canvas/20 py-4 text-center">
                  <p className="text-xs text-ui-ink-muted">{t("GRAPH.NO_CONNECTIONS")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedEdge ? (
        <div className="grid gap-4.5 p-5">
          <div>
            <span className="font-code text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-ui-divider bg-ui-canvas/70 text-brand-text">
              {t("GRAPH.RELATIONSHIP_DETAILS")}
            </span>
            <h2 className="mt-2.5 font-code text-base font-bold text-ui-ink tracking-tight break-all">
              {selectedEdge.displayLabel}
            </h2>
          </div>

          <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-code text-[0.65rem] uppercase tracking-wider text-ui-ink-muted">
                {t("GRAPH.SOURCE")}
              </span>
              <span className="h-px flex-1 mx-3 bg-ui-divider border-dashed" />
              <span className="font-code text-[0.65rem] uppercase tracking-wider text-ui-ink-muted">
                {t("GRAPH.TARGET")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                aria-label={`${t("GRAPH.SOURCE")} ${selectedEdge.source}`}
                className="flex min-h-11 flex-col justify-center rounded-lg border border-ui-divider bg-ui-raised/60 p-2.5 text-left text-ui-ink-secondary transition-all hover:border-ui-line-strong hover:bg-ui-interactive hover:text-brand-text"
                onClick={() => onFocusNode(selectedEdge.source)}
                type="button"
              >
                <span className="font-code text-[0.65rem] text-ui-ink-muted uppercase">From</span>
                <span className="truncate text-xs font-semibold">{selectedEdge.source}</span>
              </button>
              <button
                aria-label={`${t("GRAPH.TARGET")} ${selectedEdge.target}`}
                className="flex min-h-11 flex-col justify-center rounded-lg border border-ui-divider bg-ui-raised/60 p-2.5 text-left text-ui-ink-secondary transition-all hover:border-ui-line-strong hover:bg-ui-interactive hover:text-brand-text"
                onClick={() => onFocusNode(selectedEdge.target)}
                type="button"
              >
                <span className="font-code text-[0.65rem] text-ui-ink-muted uppercase">To</span>
                <span className="truncate text-xs font-semibold">{selectedEdge.target}</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-ui-divider/80 bg-ui-canvas/50 p-3.5 shadow-inner">
            <span className="font-code text-[0.62rem] uppercase tracking-wider text-ui-ink-muted block mb-1">
              {t("KNOWLEDGE.DESCRIPTION_LABEL")}
            </span>
            <p className="text-sm text-ui-ink-secondary leading-relaxed">
              {selectedEdge.description || t("KNOWLEDGE.NO_DESCRIPTION")}
            </p>
          </div>

          <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm font-code text-xs text-ui-ink">
            <span className="text-[0.65rem] uppercase text-ui-ink-muted tracking-wider block mb-0.5">
              Relation Weight
            </span>
            <span className="font-bold">
              {t("GRAPH.WEIGHT", { value: selectedEdge.weight })}
            </span>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
