import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RendererGraph } from "../types";
import { GraphCanvas, type GraphCanvasLabels } from "./GraphCanvas";

const labels: GraphCanvasLabels = {
  ariaLabel: "Knowledge graph",
  fallbackText: "Knowledge graph relationships",
  instructions: "Use Arrow, Enter, Space, and Escape to navigate the graph.",
  navigationPrefix: "Graph view controls",
  nodeLabel: "Entity details",
  relationshipLabel: "Relationship details",
  selectionPrefix: "Knowledge graph",
};

function graphWithNode(id: string, name: string): RendererGraph {
  return {
    edges: [],
    nodes: [{
      color: "#fb7185",
      degree: 0,
      frequency: 1,
      fx: null,
      fy: null,
      id,
      name,
      radius: 20,
      type: "person",
      vx: 0,
      vy: 0,
      x: 100,
      y: 100,
    }],
  };
}

function contextStub() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    fillText: vi.fn(),
    font: "",
    lineTo: vi.fn(),
    lineWidth: 1,
    measureText: vi.fn(() => ({ width: 24 })),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    shadowBlur: 0,
    shadowColor: "",
    stroke: vi.fn(),
    strokeStyle: "",
    textAlign: "",
    textBaseline: "",
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("GraphCanvas with the real renderer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    );
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(contextStub());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requires fresh keyboard navigation after a same-workspace graph replacement", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <GraphCanvas
        command={null}
        graph={graphWithNode("node-1", "Ada")}
        labels={labels}
        onSelectionChange={onSelectionChange}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    const canvas = screen.getByLabelText("Knowledge graph");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("Ada");

    rerender(
      <GraphCanvas
        command={null}
        graph={graphWithNode("node-2", "Lin")}
        labels={labels}
        onSelectionChange={onSelectionChange}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Ada");

    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("Lin");
    fireEvent.keyDown(canvas, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith({ id: "node-2", kind: "node" });
  });
});
