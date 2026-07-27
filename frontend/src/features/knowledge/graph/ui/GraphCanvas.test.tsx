import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RendererGraph } from "../types";
import { GraphCanvas, type GraphCanvasLabels } from "./GraphCanvas";

const renderer = vi.hoisted(() => ({
  createGraphRenderer: vi.fn(),
}));
vi.mock("../graph-renderer", () => renderer);

const emptyGraph: RendererGraph = { edges: [], nodes: [] };
const labels: GraphCanvasLabels = {
  ariaLabel: "Knowledge graph",
  fallbackText: "Knowledge graph relationships",
  instructions: "Use Arrow, Enter, Space, and Escape to navigate the graph.",
  navigationPrefix: "Graph view controls",
  nodeLabel: "Entity details",
  noneLabel: "No visible connections.",
  relationshipLabel: "Relationship details",
  selectionPrefix: "Knowledge graph",
};
const viLabels: GraphCanvasLabels = {
  ariaLabel: "Đồ thị tri thức",
  fallbackText: "Đồ thị tri thức và các mối quan hệ",
  instructions: "Dùng Arrow, Enter, Space và Escape để điều khiển. Cuộn để thu phóng / kéo nền để di chuyển / kéo nút để đổi vị trí.",
  navigationPrefix: "Điều khiển khung nhìn đồ thị",
  nodeLabel: "Chi tiết thực thể",
  noneLabel: "Không có liên kết hiển thị.",
  relationshipLabel: "Chi tiết mối quan hệ",
  selectionPrefix: "Đồ thị tri thức",
};

const adaGraph: RendererGraph = {
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
        labels={labels}
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
        labels={labels}
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
    render(
      <GraphCanvas
        command={null}
        graph={adaGraph}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );

    const canvas = screen.getByLabelText("Knowledge graph");
    expect(canvas).toHaveAttribute("tabindex", "0");
    expect(canvas).toHaveAccessibleDescription(labels.instructions);
    const options = renderer.createGraphRenderer.mock.calls[0]?.[1] as {
      onActiveItemChange: (selection: { id: string; kind: "node" }) => void;
    };
    act(() => options.onActiveItemChange({ id: "node-1", kind: "node" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Graph view controls: Entity details Ada",
    );
  });

  it("uses localized Vietnamese canvas copy and live navigation status", () => {
    const instance = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    renderer.createGraphRenderer.mockReturnValue(instance);
    render(
      <GraphCanvas
        command={null}
        graph={adaGraph}
        labels={viLabels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );

    const canvas = screen.getByLabelText("Đồ thị tri thức");
    expect(canvas).toHaveAccessibleDescription(viLabels.instructions);
    expect(canvas).toHaveTextContent(viLabels.fallbackText);
    const options = renderer.createGraphRenderer.mock.calls[0]?.[1] as {
      onActiveItemChange: (selection: { id: string; kind: "node" }) => void;
    };
    act(() => options.onActiveItemChange({ id: "node-1", kind: "node" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Điều khiển khung nhìn đồ thị: Chi tiết thực thể Ada",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đồ thị tri thức: Không có liên kết hiển thị.",
    );
  });

  it("clears the active navigation announcement when the workspace changes", () => {
    const first = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    const second = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    renderer.createGraphRenderer.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { rerender } = render(
      <GraphCanvas
        command={null}
        graph={adaGraph}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    const firstOptions = renderer.createGraphRenderer.mock.calls[0]?.[1] as {
      onActiveItemChange: (selection: { id: string; kind: "node" }) => void;
    };
    act(() => firstOptions.onActiveItemChange({ id: "node-1", kind: "node" }));
    expect(screen.getByRole("status")).toHaveTextContent("Ada");

    rerender(
      <GraphCanvas
        command={null}
        graph={{ edges: [], nodes: [{ ...adaGraph.nodes[0]!, id: "node-2", name: "Lin" }] }}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-2"
      />,
    );

    expect(screen.getByRole("status")).not.toHaveTextContent("Ada");
    expect(screen.getByRole("status")).toHaveTextContent(labels.noneLabel);
  });

  it("reconciles the active item when graph identities change", () => {
    const instance = { destroy: vi.fn(), execute: vi.fn(), update: vi.fn() };
    renderer.createGraphRenderer.mockReturnValue(instance);
    const { rerender } = render(
      <GraphCanvas
        command={null}
        graph={adaGraph}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    const options = renderer.createGraphRenderer.mock.calls[0]?.[1] as {
      onActiveItemChange: (selection: { id: string; kind: "node" }) => void;
    };
    act(() => options.onActiveItemChange({ id: "node-1", kind: "node" }));

    rerender(
      <GraphCanvas
        command={null}
        graph={{ edges: [], nodes: [{ ...adaGraph.nodes[0]!, name: "Ada Lovelace" }] }}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Ada Lovelace");

    rerender(
      <GraphCanvas
        command={null}
        graph={emptyGraph}
        labels={labels}
        onSelectionChange={vi.fn()}
        physicsEnabled={false}
        selection={null}
        workspaceKey="ws-1"
      />,
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("Ada Lovelace");
    expect(screen.getByRole("status")).toHaveTextContent(labels.noneLabel);
  });
});
