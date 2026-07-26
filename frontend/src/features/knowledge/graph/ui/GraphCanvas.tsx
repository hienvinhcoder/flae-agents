import { useEffect, useId, useRef, useState } from "react";

import { createGraphRenderer, type GraphRenderer } from "../graph-renderer";
import type { GraphCommand, GraphSelection, RendererGraph } from "../types";

interface GraphCanvasProps {
  command: GraphCommand | null;
  graph: RendererGraph;
  onSelectionChange: (selection: GraphSelection | null) => void;
  physicsEnabled: boolean;
  selection: GraphSelection | null;
  workspaceKey: string;
}

export function GraphCanvas({
  command,
  graph,
  onSelectionChange,
  physicsEnabled,
  selection,
  workspaceKey,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const selectionCallback = useRef(onSelectionChange);
  const [activeItem, setActiveItem] = useState<GraphSelection | null>(null);
  const instructionsId = useId();
  const statusId = useId();

  const describe = (item: GraphSelection | null, prefix: string) => {
    if (!item) return `${prefix}: none`;
    if (item.kind === "node") {
      const node = graph.nodes.find((candidate) => candidate.id === item.id);
      return `${prefix}: entity ${node?.name ?? item.id}`;
    }
    const edge = graph.edges.find((candidate) => candidate.id === item.id);
    return `${prefix}: relationship ${edge?.displayLabel ?? item.id}`;
  };

  useEffect(() => {
    selectionCallback.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createGraphRenderer(canvas, {
      onActiveItemChange: setActiveItem,
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
        Interactive knowledge graph. Arrow keys cycle through visible entities and relationships. Press Enter or Space to select and focus. Press Escape to clear selection. Drag with one pointer to move the view or a node, and pinch with two pointers to zoom.
      </p>
      <p aria-live="polite" className="sr-only" id={statusId} role="status">
        {describe(activeItem, "Navigation target")}. {describe(selection, "Selected item")}.
      </p>
      <canvas
        aria-describedby={`${instructionsId} ${statusId}`}
        aria-label="Interactive knowledge graph"
        className="block h-full min-h-[28rem] w-full cursor-grab touch-none active:cursor-grabbing"
        ref={canvasRef}
        tabIndex={0}
      >
        Knowledge graph showing entities and their relationships.
      </canvas>
    </>
  );
}
