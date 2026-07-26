import type {
  FilteredGraph,
  GraphEdgeTone,
  GraphSelection,
  KnowledgeGraphData,
  RendererEdge,
  RendererGraph,
  RendererNode,
} from "./types";

const EDGE_DESCRIPTION_FALLBACK =
  "No detailed description is available for this relationship.";
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d");
}

export function graphNodeColor(type: string) {
  const value = normalized(type);
  if (value.includes("person") || value.includes("nguoi")) return "#fb7185";
  if (
    value.includes("org") ||
    value.includes("chuc") ||
    value.includes("company") ||
    value.includes("cong ty")
  )
    return "#60a5fa";
  if (
    value.includes("loc") ||
    value.includes("diem") ||
    value.includes("city")
  )
    return "#4ade80";
  if (value.includes("event") || value.includes("su kien")) return "#fbbf24";
  if (
    value.includes("product") ||
    value.includes("san pham") ||
    value.includes("project") ||
    value.includes("du an")
  )
    return "#fb923c";
  if (
    value.includes("concept") ||
    value.includes("khai niem") ||
    value.includes("tech") ||
    value.includes("category")
  )
    return "#c084fc";
  if (
    value.includes("equipment") ||
    value.includes("thiet bi") ||
    value.includes("system") ||
    value.includes("he thong")
  )
    return "#4ade80";
  return "#ddb991";
}

export function latestEdgeLabel(label: string | null | undefined) {
  const parts = label?.split(",");
  return parts?.at(-1)?.trim() || "RELATES_TO";
}

export function latestEdgeDescription(description: string | null | undefined) {
  const parts = description?.split(" | ");
  return parts?.at(-1)?.trim() || EDGE_DESCRIPTION_FALLBACK;
}

function edgeTone(label: string | null | undefined): GraphEdgeTone {
  const value = normalized(label ?? "");
  if (value.includes("error") || value.includes("fail")) return "danger";
  if (value.includes("warn") || value.includes("stale") || value.includes("risk"))
    return "warning";
  if (value.includes("verify") || value.includes("confirm") || value.includes("ok"))
    return "success";
  if (value.includes("ai") || value.includes("infer") || value.includes("predict"))
    return "ai";
  return "default";
}

function deterministicPoint(id: string, index: number, count: number) {
  let hash = 0;
  for (let cursor = 0; cursor < id.length; cursor += 1) {
    hash = (hash * 31 + id.charCodeAt(cursor)) >>> 0;
  }
  const angle = index * GOLDEN_ANGLE + (hash % 360) * (Math.PI / 180);
  const radius = count <= 1 ? 0 : 60 + 20 * Math.sqrt(index + 1);
  return {
    x: 400 + Math.cos(angle) * radius,
    y: 300 + Math.sin(angle) * radius,
  };
}

export function adaptGraph(data: KnowledgeGraphData): RendererGraph {
  const nodeIds = new Set<string>();
  const sourceNodes = data.nodes.filter((node) => {
    if (nodeIds.has(node.id)) return false;
    nodeIds.add(node.id);
    return true;
  });
  const nodes: RendererNode[] = sourceNodes.map((node, index) => ({
    ...node,
    ...deterministicPoint(node.id, index, sourceNodes.length),
    color: graphNodeColor(node.type),
    fx: null,
    fy: null,
    radius: Math.max(
      1,
      Math.min(18 + (node.frequency > 0 ? node.frequency : 1) * 2, 35),
    ),
    vx: 0,
    vy: 0,
  }));
  const edgeIds = new Set<string>();
  const edges: RendererEdge[] = data.edges.flatMap((edge) => {
    if (
      edgeIds.has(edge.id) ||
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target)
    )
      return [];
    edgeIds.add(edge.id);
    const tone = edgeTone(edge.label);
    return [
      {
        ...edge,
        dashed: tone === "ai",
        description: latestEdgeDescription(edge.description),
        displayLabel: latestEdgeLabel(edge.label),
        tone,
      },
    ];
  });
  return { edges, nodes };
}

export function filterGraph(
  graph: RendererGraph,
  type: string,
  selection: GraphSelection | null,
): FilteredGraph {
  const nodes =
    type === "all" ? graph.nodes : graph.nodes.filter((node) => node.type === type);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges =
    type === "all"
      ? graph.edges
      : graph.edges.filter(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
        );
  const selectionVisible = selection
    ? selection.kind === "node"
      ? nodeIds.has(selection.id)
      : edges.some((edge) => edge.id === selection.id)
    : true;
  return {
    graph: { edges, nodes },
    selection: selectionVisible ? selection : null,
  };
}
