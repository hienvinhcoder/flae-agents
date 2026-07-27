import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../../public/assets/i18n/en.json";
import viTranslations from "../../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../../tests/TestI18nProvider";
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

function renderControl(ui: ReactElement) {
  return render(ui, { wrapper: TestI18nProvider });
}

describe("graph controls", () => {
  it("uses 44px targets for graph view controls", () => {
    renderControl(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search=""
        suggestions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /zoom in/i }).className).toContain(
      "min-h-11",
    );
    expect(screen.getByRole("button", { name: /zoom in/i }).className).toContain(
      "min-w-11",
    );
    expect(screen.getByRole("searchbox", { name: /search entities/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
  });

  it("uses 44px targets across filters and graph details", () => {
    renderControl(
      <>
        <GraphFilters
          nodeType="all"
          nodeTypes={["person"]}
          onNodeTypeChange={vi.fn()}
          onPhysicsChange={vi.fn()}
          physicsEnabled
        />
        <GraphSelectionPanel
          neighbors={[neighbor]}
          onClose={vi.fn()}
          onFocusNode={vi.fn()}
          selectedEdge={null}
          selectedNode={node}
        />
      </>,
    );

    expect(screen.getByRole("combobox", { name: /entity type/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: /physics on/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: /close details/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: /focus flae/i })).toHaveClass(
      "min-h-11",
    );
  });

  it("keeps the exact localized graph namespace in parity", () => {
    const expectedKeys = [
      "EYEBROW", "DESCRIPTION", "VISIBLE_COUNTS", "TOOLS_ARIA",
      "BACK_TO_KNOWLEDGE", "SEARCH_LABEL", "SEARCH_PLACEHOLDER",
      "VIEW_CONTROLS", "ZOOM_IN", "ZOOM_OUT", "FIT_GRAPH", "ENTITY_TYPE",
      "ALL_ENTITY_TYPES", "PHYSICS_ON", "PHYSICS_OFF", "LOADING",
      "SELECT_WORKSPACE", "SELECT_WORKSPACE_DESCRIPTION", "EMPTY_TITLE",
      "EMPTY_DESCRIPTION", "OPEN_KNOWLEDGE", "GESTURE_HINT", "ENTITY_DETAILS",
      "RELATIONSHIP_DETAILS", "CLOSE_DETAILS", "CONNECTED_ENTITIES",
      "NO_CONNECTIONS", "FREQUENCY", "DEGREE", "WEIGHT", "LOAD_ERROR",
    ];
    const enGraph = (en as Record<string, unknown>).GRAPH as Record<string, string>;
    const viGraph = (viTranslations as Record<string, unknown>).GRAPH as Record<string, string>;

    expect(Object.keys(enGraph)).toEqual(expectedKeys);
    expect(Object.keys(viGraph)).toEqual(expectedKeys);
    expect(viGraph.ZOOM_IN).toBe("Phóng to");
  });

  it("only references the search result list while suggestions are rendered", () => {
    const { rerender } = renderControl(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search=""
        suggestions={[]}
      />,
    );

    expect(screen.getByRole("searchbox", { name: /search entities/i })).not.toHaveAttribute(
      "aria-controls",
    );

    rerender(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search="ada"
        suggestions={[node]}
      />,
    );

    expect(screen.getByRole("searchbox", { name: /search entities/i })).toHaveAttribute(
      "aria-controls",
      "graph-search-results",
    );
  });

  it("GRAPH-02C emits search, focus, zoom, and reset actions", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    const onSearchChange = vi.fn();
    const onCommand = vi.fn();
    renderControl(
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
    renderControl(
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
    renderControl(
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
    renderControl(
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
