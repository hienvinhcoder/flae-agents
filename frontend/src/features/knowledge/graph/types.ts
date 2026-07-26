import { z } from "zod";

export const graphNodeSchema = z.object({
  degree: z.number().int().nonnegative().default(0),
  description: z.string().nullable().optional(),
  frequency: z.number().int().nonnegative().default(1),
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
});

export const graphEdgeSchema = z.object({
  description: z.string().nullable().optional(),
  id: z.string().min(1),
  label: z.string().nullable().optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  weight: z.number().int().nonnegative().default(1),
});

export const knowledgeGraphDataSchema = z.object({
  edges: graphEdgeSchema.array(),
  nodes: graphNodeSchema.array(),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type KnowledgeGraphData = z.infer<typeof knowledgeGraphDataSchema>;

export interface RendererNode extends GraphNode {
  color: string;
  fx: number | null;
  fy: number | null;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export type GraphEdgeTone = "ai" | "danger" | "default" | "success" | "warning";

export interface RendererEdge extends GraphEdge {
  dashed: boolean;
  description: string;
  displayLabel: string;
  tone: GraphEdgeTone;
}

export interface RendererGraph {
  edges: RendererEdge[];
  nodes: RendererNode[];
}

export type GraphSelection =
  | { id: string; kind: "edge" }
  | { id: string; kind: "node" };

export type GraphCommandType = "focus" | "reset" | "zoom-in" | "zoom-out";

export interface GraphCommand {
  id: number;
  nodeId?: string;
  type: GraphCommandType;
}

export interface FilteredGraph {
  graph: RendererGraph;
  selection: GraphSelection | null;
}
