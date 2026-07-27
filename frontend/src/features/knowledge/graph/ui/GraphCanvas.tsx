import { useEffect, useId, useRef, useState } from "react";

import { createGraphRenderer, type GraphRenderer } from "../graph-renderer";
import type { GraphCommand, GraphSelection, RendererGraph } from "../types";

interface GraphCanvasProps {
  command: GraphCommand | null;
  graph: RendererGraph;
  labels: GraphCanvasLabels;
  onSelectionChange: (selection: GraphSelection | null) => void;
  physicsEnabled: boolean;
  selection: GraphSelection | null;
  workspaceKey: string;
}

export interface GraphCanvasLabels {
  ariaLabel: string;
  fallbackText: string;
  instructions: string;
  navigationPrefix: string;
  nodeLabel: string;
  noneLabel: string;
  relationshipLabel: string;
  selectionPrefix: string;
}

interface ActiveState {
  item: GraphSelection | null;
  workspaceKey: string;
}

export function GraphCanvas({
  command,
  graph,
  labels,
  onSelectionChange,
  physicsEnabled,
  selection,
  workspaceKey,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const selectionCallback = useRef(onSelectionChange);
  const [activeState, setActiveState] = useState<ActiveState>({
    item: null,
    workspaceKey,
  });
  const instructionsId = useId();
  const statusId = useId();

  const activeItem = activeState.workspaceKey === workspaceKey
    && activeState.item
    && (activeState.item.kind === "node"
      ? graph.nodes.some((node) => node.id === activeState.item?.id)
      : graph.edges.some((edge) => edge.id === activeState.item?.id))
    ? activeState.item
    : null;

  const describe = (item: GraphSelection | null, prefix: string) => {
    if (!item) return `${prefix}: ${labels.noneLabel}`;
    if (item.kind === "node") {
      const node = graph.nodes.find((candidate) => candidate.id === item.id);
      return `${prefix}: ${labels.nodeLabel} ${node?.name ?? item.id}`;
    }
    const edge = graph.edges.find((candidate) => candidate.id === item.id);
    return `${prefix}: ${labels.relationshipLabel} ${edge?.displayLabel ?? item.id}`;
  };

  useEffect(() => {
    selectionCallback.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createGraphRenderer(canvas, {
      onActiveItemChange: (item) => setActiveState({ item, workspaceKey }),
      onSelectionChange: (nextSelection) =>
        selectionCallback.current(nextSelection),
    });
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [workspaceKey]);

  useEffect(() => {
    rendererRef.current?.update({ graph, physicsEnabled, selection });
  }, [graph, physicsEnabled, selection, workspaceKey]);

  useEffect(() => {
    if (command) rendererRef.current?.execute(command);
  }, [command]);

  return (
    <>
      <p className="sr-only" id={instructionsId}>
        {labels.instructions}
      </p>
      <p aria-live="polite" className="sr-only" id={statusId} role="status">
        {describe(activeItem, labels.navigationPrefix)} {describe(selection, labels.selectionPrefix)}
      </p>
      <canvas
        aria-describedby={instructionsId}
        aria-label={labels.ariaLabel}
        className="block h-full min-h-[28rem] w-full cursor-grab touch-none active:cursor-grabbing"
        ref={canvasRef}
        tabIndex={0}
      >
        {labels.fallbackText}
      </canvas>
    </>
  );
}
