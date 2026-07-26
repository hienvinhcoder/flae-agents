import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RendererGraph } from "../types";
import { GraphCanvas } from "./GraphCanvas";

const renderer = vi.hoisted(() => ({
  createGraphRenderer: vi.fn(),
}));
vi.mock("../graph-renderer", () => renderer);

const emptyGraph: RendererGraph = { edges: [], nodes: [] };

describe("GraphCanvas", () => {
  beforeEach(() => renderer.createGraphRenderer.mockReset());

  it("GRAPH-06 destroys and replaces the renderer on workspace changes and unmount", () => {
    const first = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    const second = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    renderer.createGraphRenderer.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { rerender, unmount } = render(
      <GraphCanvas
        command={null}
        graph={emptyGraph}
        onSelectionChange={vi.fn()}
        physicsEnabled
        selection={null}
        workspaceKey="ws-1"
      />,
    );

    expect(first.update).toHaveBeenCalled();
    rerender(
      <GraphCanvas
        command={null}
        graph={emptyGraph}
        onSelectionChange={vi.fn()}
        physicsEnabled
        selection={null}
        workspaceKey="ws-2"
      />,
    );
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(second.update).toHaveBeenCalled();
    unmount();
    expect(second.destroy).toHaveBeenCalledOnce();
  });

  it("GRAPH-02A exposes keyboard instructions and live navigation state", () => {
    const instance = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    renderer.createGraphRenderer.mockReturnValue(instance);
    const graph: RendererGraph = {
      edges: [],
      nodes: [
        {
          color: "#fb7185",
          degree: 0,
          frequency: 1,
          fx: null,
          fy: null,
          id: "node-1",
          name: "Ada",
          radius: 20,
          type: "person",
          vx: 0,
          vy: 0,
          x: 100,
          y: 100,
        },
      ],
    };
    render(
      <GraphCanvas
        command={null}
        graph={graph}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );

    const canvas = screen.getByLabelText(/interactive knowledge graph/i);
    expect(canvas).toHaveAttribute("tabindex", "0");
    expect(canvas).toHaveAccessibleDescription(/arrow keys cycle/i);
    const options = renderer.createGraphRenderer.mock.calls[0]?.[1] as {
      onActiveItemChange: (selection: { id: string; kind: "node" }) => void;
    };
    act(() => options.onActiveItemChange({ id: "node-1", kind: "node" }));
    expect(screen.getByRole("status")).toHaveTextContent("Navigation target: entity Ada");
  });
});
