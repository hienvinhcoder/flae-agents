import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RendererEdge, RendererNode } from "../types";
import { GraphFilters } from "./GraphFilters";
import { GraphSelectionPanel } from "./GraphSelectionPanel";
import { GraphToolbar } from "./GraphToolbar";

const node: RendererNode = {
  color: "#fb7185",
  degree: 1,
  description: "Founder",
  frequency: 4,
  fx: null,
  fy: null,
  id: "node-1",
  name: "Ada",
  radius: 26,
  type: "person",
  vx: 0,
  vy: 0,
  x: 100,
  y: 100,
};
const neighbor: RendererNode = {
  ...node,
  color: "#60a5fa",
  id: "node-2",
  name: "FLAE",
  type: "company",
};
const edge: RendererEdge = {
  dashed: false,
  description: "Current relationship",
  displayLabel: "FOUNDED",
  id: "edge-1",
  label: "OLD, FOUNDED",
  source: "node-1",
  target: "node-2",
  tone: "default",
  weight: 2,
};

describe("graph controls", () => {
  it("GRAPH-02C emits search, focus, zoom, and reset actions", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    const onSearchChange = vi.fn();
    const onCommand = vi.fn();
    render(
      <GraphToolbar
        onCommand={onCommand}
        onFocusNode={onFocusNode}
        onSearchChange={onSearchChange}
        search="ad"
        suggestions={[node]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: /search entities/i }), "a");
    expect(onSearchChange).toHaveBeenLastCalledWith("ada");
    await user.click(screen.getByRole("option", { name: /ada person/i }));
    expect(onFocusNode).toHaveBeenCalledWith("node-1");
    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    await user.click(screen.getByRole("button", { name: /zoom out/i }));
    await user.click(screen.getByRole("button", { name: /fit graph/i }));
    expect(onCommand).toHaveBeenNthCalledWith(1, "zoom-in");
    expect(onCommand).toHaveBeenNthCalledWith(2, "zoom-out");
    expect(onCommand).toHaveBeenNthCalledWith(3, "reset");
  });

  it("GRAPH-03 emits typed filters and physics state", async () => {
    const user = userEvent.setup();
    const onNodeTypeChange = vi.fn();
    const onPhysicsChange = vi.fn();
    render(
      <GraphFilters
        nodeType="all"
        nodeTypes={["company", "person"]}
        onNodeTypeChange={onNodeTypeChange}
        onPhysicsChange={onPhysicsChange}
        physicsEnabled
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: /entity type/i }), "person");
    expect(onNodeTypeChange).toHaveBeenCalledWith("person");
    await user.click(screen.getByRole("button", { name: /physics on/i }));
    expect(onPhysicsChange).toHaveBeenCalledWith(false);
  });

  it("GRAPH-02A renders node details and focuses neighboring nodes", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    render(
      <GraphSelectionPanel
        neighbors={[neighbor]}
        onClose={vi.fn()}
        onFocusNode={onFocusNode}
        selectedEdge={null}
        selectedNode={node}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
    expect(screen.getByText(/frequency 4/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /focus flae/i }));
    expect(onFocusNode).toHaveBeenCalledWith("node-2");
  });

  it("GRAPH-02A renders edge details and navigates to either endpoint", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    render(
      <GraphSelectionPanel
        neighbors={[]}
        onClose={vi.fn()}
        onFocusNode={onFocusNode}
        selectedEdge={edge}
        selectedNode={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "FOUNDED" })).toBeInTheDocument();
    expect(screen.getByText("Current relationship")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /focus source node-1/i }));
    await user.click(screen.getByRole("button", { name: /focus target node-2/i }));
    expect(onFocusNode.mock.calls).toEqual([["node-1"], ["node-2"]]);
  });
});
