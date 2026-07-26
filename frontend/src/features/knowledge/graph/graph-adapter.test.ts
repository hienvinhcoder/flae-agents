import { describe, expect, it } from "vitest";

import {
  adaptGraph,
  filterGraph,
  graphNodeColor,
  latestEdgeDescription,
  latestEdgeLabel,
} from "./graph-adapter";
import type { GraphSelection, KnowledgeGraphData } from "./types";

const source: KnowledgeGraphData = {
  edges: [
    {
      description: "old | Current relationship",
      id: "edge-1",
      label: "OLD, CURRENT",
      source: "person-1",
      target: "org-1",
      weight: 2,
    },
    {
      id: "edge-dangling",
      label: null,
      source: "person-1",
      target: "missing",
      weight: 1,
    },
  ],
  nodes: [
    {
      degree: 1,
      description: "Founder",
      frequency: 4,
      id: "person-1",
      name: "Ada",
      type: "person",
    },
    {
      degree: 1,
      description: null,
      frequency: 1,
      id: "org-1",
      name: "FLAE",
      type: "company",
    },
  ],
};

describe("graph adapter", () => {
  it("GRAPH-01 maps empty input and renderer values without DOM access", () => {
    expect(adaptGraph({ edges: [], nodes: [] })).toEqual({
      edges: [],
      nodes: [],
    });

    const graph = adaptGraph(source);
    expect(graph.nodes[0]).toMatchObject({
      color: "#fb7185",
      radius: 26,
    });
    expect(typeof graph.nodes[0]?.x).toBe("number");
    expect(typeof graph.nodes[0]?.y).toBe("number");
    expect(graph.edges[0]).toMatchObject({
      dashed: false,
      description: "Current relationship",
      displayLabel: "CURRENT",
    });
  });

  it("GRAPH-01 creates deterministic positions and labels", () => {
    expect(adaptGraph(source)).toEqual(adaptGraph(source));
    expect(latestEdgeLabel(undefined)).toBe("RELATES_TO");
    expect(latestEdgeLabel("alpha, beta")).toBe("beta");
    expect(latestEdgeDescription(undefined)).toBe(
      "No detailed description is available for this relationship.",
    );
    expect(latestEdgeDescription("old | newest")).toBe("newest");
  });

  it("GRAPH-01 handles aliases and unknown node types with stable colors", () => {
    expect(graphNodeColor("person")).toBe("#fb7185");
    expect(graphNodeColor("cong ty company")).toBe("#60a5fa");
    expect(graphNodeColor("city location")).toBe("#4ade80");
    expect(graphNodeColor("event")).toBe("#fbbf24");
    expect(graphNodeColor("product project")).toBe("#fb923c");
    expect(graphNodeColor("concept tech category")).toBe("#c084fc");
    expect(graphNodeColor("equipment system")).toBe("#4ade80");
    expect(graphNodeColor("unclassified")).toBe("#ddb991");
  });

  it("GRAPH-01 normalizes Vietnamese d-stroke location aliases", () => {
    expect(graphNodeColor("\u0111i\u1ec3m")).toBe("#4ade80");
    expect(graphNodeColor("\u0110\u1ecba \u0111i\u1ec3m")).toBe("#4ade80");
  });

  it("GRAPH-01 keeps renderer radius positive for unsafe direct input", () => {
    const unsafe = {
      edges: [],
      nodes: [{ ...source.nodes[0]!, frequency: -100 }],
    };
    expect(adaptGraph(unsafe).nodes[0]!.radius).toBeGreaterThan(0);
    expect(
      adaptGraph({ edges: [], nodes: [{ ...source.nodes[0]!, frequency: 0 }] })
        .nodes[0]!.radius,
    ).toBe(20);
  });

  it("GRAPH-03 drops duplicate IDs and dangling edges from topology", () => {
    const firstEdge = source.edges[0]!;
    const danglingEdge = source.edges[1]!;
    const firstNode = source.nodes[0]!;
    const secondNode = source.nodes[1]!;
    const graph = adaptGraph({
      edges: [
        firstEdge,
        { ...firstEdge, source: "org-1", target: "person-1" },
        danglingEdge,
      ],
      nodes: [firstNode, { ...firstNode, name: "Duplicate" }, secondNode],
    });

    expect(graph.nodes.map((node) => node.name)).toEqual(["Ada", "FLAE"]);
    expect(graph.edges.map((edge) => edge.id)).toEqual(["edge-1"]);
  });

  it("GRAPH-03 isolates hidden nodes and their edges from the visible graph", () => {
    const graph = filterGraph(adaptGraph(source), "person", null);

    expect(graph.graph.nodes.map((node) => node.id)).toEqual(["person-1"]);
    expect(graph.graph.edges).toEqual([]);
  });

  it.each([
    [{ kind: "node", id: "org-1" }],
    [{ kind: "edge", id: "edge-1" }],
  ] as [GraphSelection][]) (
    "GRAPH-04 clears a %s selection when the type filter hides it",
    (selection) => {
      expect(filterGraph(adaptGraph(source), "person", selection).selection).toBeNull();
    },
  );

  it("GRAPH-04 preserves a visible node selection", () => {
    const selection: GraphSelection = { kind: "node", id: "person-1" };
    expect(filterGraph(adaptGraph(source), "person", selection).selection).toEqual(selection);
  });

  it("GRAPH-04 clears missing selections even when all types are visible", () => {
    expect(
      filterGraph(adaptGraph(source), "all", { kind: "node", id: "missing" })
        .selection,
    ).toBeNull();
  });
});
