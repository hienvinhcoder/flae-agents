import { ArrowRight, X } from "lucide-react";
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
      className="absolute inset-x-3 bottom-3 z-20 max-h-[55%] overflow-y-auto rounded-ui-dialog border border-ui-divider bg-ui-panel/90 shadow-ui-overlay backdrop-blur-md md:inset-y-3 md:left-auto md:max-h-none md:w-[22rem]"
    >
      <header className="sticky top-0 flex items-center justify-between border-b border-ui-divider bg-ui-panel/95 px-4 py-3 backdrop-blur-sm">
        <span className="font-code text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ui-ink-muted">
          {t(selectedNode ? "GRAPH.ENTITY_DETAILS" : "GRAPH.RELATIONSHIP_DETAILS")}
        </span>
        <button
          aria-label={t("GRAPH.CLOSE_DETAILS")}
          className="grid min-h-11 min-w-11 place-items-center rounded-ui-control text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </header>
      {selectedNode ? (
        <div className="grid gap-5 p-4">
          <div>
            <span
              className="font-code text-[0.62rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-ui-divider bg-ui-canvas/60"
              style={{ color: selectedNode.color }}
            >
              {selectedNode.type || t("GRAPH.ENTITY_TYPE")}
            </span>
            <h2 className="mt-2 text-xl font-bold text-ui-ink tracking-tight">{selectedNode.name}</h2>
          </div>
          <p className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3.5 text-sm text-ui-ink-secondary leading-relaxed">
            {selectedNode.description || t("KNOWLEDGE.NO_DESCRIPTION")}
          </p>
          <div className="grid grid-cols-2 gap-2.5 font-code text-xs text-ui-ink-secondary">
            <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm flex flex-col justify-center items-center">
              <span className="font-semibold text-ui-ink">{t("GRAPH.FREQUENCY", { value: selectedNode.frequency })}</span>
            </div>
            <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm flex flex-col justify-center items-center">
              <span className="font-semibold text-ui-ink">{t("GRAPH.DEGREE", { value: selectedNode.degree })}</span>
            </div>
          </div>
          <div>
            <h3 className="font-code text-[0.65rem] font-bold uppercase tracking-wider text-ui-ink-muted mb-2">
              {t("GRAPH.CONNECTED_ENTITIES", { count: neighbors.length })}
            </h3>
            <div className="grid gap-2">
              {neighbors.length ? (
                neighbors.map((neighbor) => (
                  <button
                    className="group flex min-h-11 min-w-11 items-center justify-between gap-3 rounded-ui-panel border border-ui-divider bg-ui-canvas/30 px-3.5 text-left text-sm text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
                    key={neighbor.id}
                    onClick={() => onFocusNode(neighbor.id)}
                    type="button"
                  >
                    <span className="truncate font-medium group-hover:text-brand-text transition-colors">
                      {neighbor.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-code text-[0.62rem] uppercase tracking-wider text-ui-ink-muted bg-ui-canvas/60 px-1.5 py-0.5 rounded border border-ui-divider">
                        {neighbor.type || t("GRAPH.ENTITY_TYPE")}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-ui-ink-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-ui-ink-muted py-2">{t("GRAPH.NO_CONNECTIONS")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {selectedEdge ? (
        <div className="grid gap-5 p-4">
          <div>
            <span className="font-code text-[0.62rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-ui-divider bg-ui-canvas/60 text-brand-text">
              {t("GRAPH.RELATIONSHIP_DETAILS")}
            </span>
            <h2 className="mt-2 font-code text-base font-bold text-ui-ink tracking-tight break-all">
              {selectedEdge.displayLabel}
            </h2>
          </div>
          <div className="grid gap-2 border-y border-ui-divider py-3">
            <div className="flex items-center justify-between">
              <span className="font-code text-[0.65rem] uppercase text-ui-ink-muted">{t("GRAPH.SOURCE")}</span>
              <span className="h-px flex-1 mx-4 bg-ui-divider border-dashed"></span>
              <span className="font-code text-[0.65rem] uppercase text-ui-ink-muted">{t("GRAPH.TARGET")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                aria-label={`${t("GRAPH.SOURCE")} ${selectedEdge.source}`}
                className="flex min-h-11 flex-col justify-center rounded-ui-panel border border-ui-divider bg-ui-canvas/30 p-2.5 text-left text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-brand-text"
                onClick={() => onFocusNode(selectedEdge.source)}
                type="button"
              >
                <span className="truncate text-xs font-semibold">{selectedEdge.source}</span>
              </button>
              <button
                aria-label={`${t("GRAPH.TARGET")} ${selectedEdge.target}`}
                className="flex min-h-11 flex-col justify-center rounded-ui-panel border border-ui-divider bg-ui-canvas/30 p-2.5 text-left text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-brand-text"
                onClick={() => onFocusNode(selectedEdge.target)}
                type="button"
              >
                <span className="truncate text-xs font-semibold">{selectedEdge.target}</span>
              </button>
            </div>
          </div>
          <p className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3.5 text-sm text-ui-ink-secondary leading-relaxed">
            {selectedEdge.description || t("KNOWLEDGE.NO_DESCRIPTION")}
          </p>
          <div className="rounded-xl border border-ui-divider bg-ui-canvas/40 p-3 text-center shadow-sm font-code text-xs text-ui-ink-secondary">
            {t("GRAPH.WEIGHT", { value: selectedEdge.weight })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
