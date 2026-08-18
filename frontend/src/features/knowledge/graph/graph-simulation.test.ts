import { describe, expect, it } from "vitest";

import { buildGraphIndex, stepGraphPhysics } from "./graph-simulation";
import type { RendererGraph, RendererNode } from "./types";

function node(index: number): RendererNode {
  return {
    color: "#ddb991",
    degree: 2,
    frequency: 1,
    fx: null,
    fy: null,
    id: `node-${index}`,
    name: `Node ${index}`,
    radius: 20,
    type: "concept",
    vx: 0,
    vy: 0,
    x: index * 4,
    y: (index % 10) * 8,
  };
}

describe("graph simulation index", () => {
  it("GRAPH-03 precomputes adjacency for a representative larger graph", () => {
    const nodes = Array.from({ length: 200 }, (_, index) => node(index));
    const graph: RendererGraph = {
      nodes,
      edges: Array.from({ length: 398 }, (_, index) => ({
        dashed: false,
        description: "Related",
        displayLabel: "RELATED",
        id: `edge-${index}`,
        label: "RELATED",
        source: `node-${index % 199}`,
        target: `node-${(index % 199) + 1}`,
        tone: "default",
        weight: 1,
      })),
    };

    const index = buildGraphIndex(graph);
    expect(index.nodesById.size).toBe(200);
    expect(index.neighborsById.get("node-100")).toEqual(
      new Set(["node-99", "node-101"]),
    );
    const motion = stepGraphPhysics(graph, index, 800, 600);
    expect(Number.isFinite(motion)).toBe(true);
    expect(graph.nodes.every((candidate) => Number.isFinite(candidate.x))).toBe(true);
  });
});
