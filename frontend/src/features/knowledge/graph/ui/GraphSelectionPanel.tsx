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
      className="absolute inset-x-3 bottom-3 z-20 max-h-[55%] overflow-y-auto rounded-ui-dialog border border-ui-line-strong bg-ui-panel/95 shadow-ui-overlay md:inset-y-3 md:left-auto md:w-[22rem]"
    >
      <header className="sticky top-0 flex items-center justify-between border-b border-ui-divider bg-ui-panel px-4 py-3">
        <span className="font-code text-[0.68rem] uppercase tracking-[0.16em] text-ui-ink-muted">
          {t(selectedNode ? "GRAPH.ENTITY_DETAILS" : "GRAPH.RELATIONSHIP_DETAILS")}
        </span>
        <button aria-label={t("GRAPH.CLOSE_DETAILS")} className="grid min-h-11 min-w-11 place-items-center rounded-ui-control text-ui-ink-secondary transition-colors hover:bg-ui-interactive motion-reduce:transition-none" onClick={onClose} type="button">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </header>
      {selectedNode ? (
        <div className="grid gap-5 p-4">
          <div>
            <span className="font-code text-xs font-bold uppercase" style={{ color: selectedNode.color }}>{selectedNode.type || "other"}</span>
            <h2 className="mt-1 text-xl font-bold text-ui-ink">{selectedNode.name}</h2>
          </div>
          <p className="rounded-ui-control border border-ui-divider bg-ui-canvas/60 p-3 text-ui-ink-secondary">
            {selectedNode.description || t("KNOWLEDGE.NO_DESCRIPTION")}
          </p>
          <div className="grid grid-cols-2 gap-2 font-code text-xs text-ui-ink-secondary">
            <span className="rounded-ui-control border border-ui-divider bg-ui-canvas/50 p-3">{t("GRAPH.FREQUENCY", { value: selectedNode.frequency })}</span>
            <span className="rounded-ui-control border border-ui-divider bg-ui-canvas/50 p-3">{t("GRAPH.DEGREE", { value: selectedNode.degree })}</span>
          </div>
          <div>
            <h3 className="font-code text-xs uppercase tracking-wider text-ui-ink-muted">{t("GRAPH.CONNECTED_ENTITIES", { count: neighbors.length })}</h3>
            <div className="mt-2 grid gap-2">
              {neighbors.length ? neighbors.map((neighbor) => (
                <button
                  aria-label={`Focus ${neighbor.name}`}
                  className="flex min-h-11 min-w-11 items-center justify-between gap-2 rounded-ui-control border border-ui-divider bg-ui-canvas/50 px-3 text-left text-ui-ink-secondary transition-colors hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
                  key={neighbor.id}
                  onClick={() => onFocusNode(neighbor.id)}
                  type="button"
                >
                  <span className="truncate font-semibold">{neighbor.name}</span>
                  <span className="font-code text-[0.65rem] uppercase text-ui-ink-muted">{neighbor.type}</span>
                </button>
              )) : <p className="text-sm text-ui-ink-muted">{t("GRAPH.NO_CONNECTIONS")}</p>}
            </div>
          </div>
        </div>
      ) : null}
      {selectedEdge ? (
        <div className="grid gap-5 p-4">
          <div>
            <span className="font-code text-xs font-bold uppercase text-brand">{t("GRAPH.RELATIONSHIP_DETAILS")}</span>
            <h2 className="mt-1 font-code text-lg font-bold text-ui-ink">{selectedEdge.displayLabel}</h2>
          </div>
          <div className="grid gap-2">
            <button aria-label={`Focus source ${selectedEdge.source}`} className="flex min-h-11 min-w-11 items-center justify-between rounded-ui-control border border-ui-divider bg-ui-canvas/50 p-3 text-left text-ui-ink-secondary transition-colors hover:bg-ui-interactive motion-reduce:transition-none" onClick={() => onFocusNode(selectedEdge.source)} type="button">
              <span><small className="block text-ui-ink-muted">Source</small>{selectedEdge.source}</span><ArrowRight aria-hidden className="h-4 w-4" />
            </button>
            <button aria-label={`Focus target ${selectedEdge.target}`} className="flex min-h-11 min-w-11 items-center justify-between rounded-ui-control border border-ui-divider bg-ui-canvas/50 p-3 text-left text-ui-ink-secondary transition-colors hover:bg-ui-interactive motion-reduce:transition-none" onClick={() => onFocusNode(selectedEdge.target)} type="button">
              <span><small className="block text-ui-ink-muted">Target</small>{selectedEdge.target}</span><ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <p className="rounded-ui-control border border-ui-divider bg-ui-canvas/60 p-3 text-ui-ink-secondary">{selectedEdge.description}</p>
          <p className="font-code text-sm text-ui-ink-secondary">{t("GRAPH.WEIGHT", { value: selectedEdge.weight })}</p>
        </div>
      ) : null}
    </aside>
  );
}
