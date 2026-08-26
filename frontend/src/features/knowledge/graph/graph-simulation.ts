import type { RendererGraph, RendererNode } from "./types";

export interface GraphIndex {
  neighborsById: Map<string, Set<string>>;
  nodesById: Map<string, RendererNode>;
}

export function buildGraphIndex(graph: RendererGraph): GraphIndex {
  const nodesById = new Map(
    graph.nodes.map((node) => [node.id, node] as const),
  );
  const neighborsById = new Map(
    graph.nodes.map((node) => [node.id, new Set<string>()] as const),
  );
  graph.edges.forEach((edge) => {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) return;
    neighborsById.get(edge.source)?.add(edge.target);
    neighborsById.get(edge.target)?.add(edge.source);
  });
  return { neighborsById, nodesById };
}

export function stepGraphPhysics(
  graph: RendererGraph,
  index: GraphIndex,
  width: number,
  height: number,
) {
  const nodes = graph.nodes;
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const a = nodes[first];
      const b = nodes[second];
      if (!a || !b) continue;
      const dx = b.x - a.x || 0.01;
      const dy = b.y - a.y || 0.01;
      const distance = Math.max(Math.hypot(dx, dy), 12);
      const force = Math.min(2200 / (distance * distance), 12);
      if (a.fx === null) {
        a.vx -= (dx / distance) * force;
        a.vy -= (dy / distance) * force;
      }
      if (b.fx === null) {
        b.vx += (dx / distance) * force;
        b.vy += (dy / distance) * force;
      }
    }
  }
  graph.edges.forEach((edge) => {
    const source = index.nodesById.get(edge.source);
    const target = index.nodesById.get(edge.target);
    if (!source || !target) return;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const force = (distance - 170) * 0.003;
    if (source.fx === null) {
      source.vx += (dx / distance) * force;
      source.vy += (dy / distance) * force;
    }
    if (target.fx === null) {
      target.vx -= (dx / distance) * force;
      target.vy -= (dy / distance) * force;
    }
  });
  let maxMotion = 0;
  nodes.forEach((node) => {
    if (node.fx !== null && node.fy !== null) {
      node.x = node.fx;
      node.y = node.fy;
      node.vx = 0;
      node.vy = 0;
      return;
    }
    node.vx += (width / 2 - node.x) * 0.00035;
    node.vy += (height / 2 - node.y) * 0.00035;
    node.x += node.vx;
    node.y += node.vy;
    node.vx *= 0.88;
    node.vy *= 0.88;
    maxMotion = Math.max(maxMotion, Math.abs(node.vx) + Math.abs(node.vy));
  });
  return maxMotion;
}
