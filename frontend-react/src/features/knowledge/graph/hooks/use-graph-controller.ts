import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { queryKeys } from "../../../../shared/lib/query-keys";
import * as runtimeApi from "../../api/knowledge-runtime-api";
import { adaptGraph, filterGraph } from "../graph-adapter";
import type { GraphCommand, GraphSelection, RendererGraph } from "../types";

const EMPTY_GRAPH: RendererGraph = { edges: [], nodes: [] };

interface GraphUiState {
  nodeType: string;
  physicsEnabled: boolean;
  search: string;
  selection: GraphSelection | null;
  workspaceId: string | null;
}

function initialUiState(workspaceId: string | null): GraphUiState {
  return {
    nodeType: "all",
    physicsEnabled: true,
    search: "",
    selection: null,
    workspaceId,
  };
}

function selectionExists(
  data: { edges: readonly { id: string; source: string; target: string }[]; nodes: readonly { id: string }[] },
  selection: GraphSelection,
) {
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  if (selection.kind === "node") return nodeIds.has(selection.id);
  return data.edges.some(
    (edge) =>
      edge.id === selection.id &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target),
  );
}

export function useGraphController(workspaceId: string | null) {
  const [storedUi, setStoredUi] = useState(() => initialUiState(workspaceId));
  const [command, setCommand] = useState<GraphCommand | null>(null);
  const commandId = useRef(0);
  let ui = storedUi;
  if (storedUi.workspaceId !== workspaceId) {
    ui = initialUiState(workspaceId);
    setStoredUi(ui);
  }
  const workspaceKey = workspaceId ?? "none";
  const query = useQuery({
    enabled: Boolean(workspaceId),
    gcTime: 0,
    queryFn: async ({ signal }) => {
      try {
        const data = await runtimeApi.getKnowledgeGraph(
          workspaceId as string,
          signal,
        );
        setStoredUi((current) =>
          current.workspaceId === workspaceId &&
          current.selection &&
          !selectionExists(data, current.selection)
            ? { ...current, selection: null }
            : current,
        );
        return data;
      } catch (error) {
        if (!signal.aborted) {
          setStoredUi((current) =>
            current.workspaceId === workspaceId
              ? { ...current, selection: null }
              : current,
          );
        }
        throw error;
      }
    },
    queryKey: queryKeys.knowledgeGraph(workspaceKey),
  });
  const allGraph = useMemo(
    () =>
      workspaceId && query.isSuccess && query.data
        ? adaptGraph(query.data)
        : EMPTY_GRAPH,
    [query.data, query.isSuccess, workspaceId],
  );
  const filtered = useMemo(
    () => filterGraph(allGraph, ui.nodeType, ui.selection),
    [allGraph, ui.nodeType, ui.selection],
  );
  const selection = filtered.selection;
  const updateUi = useCallback(
    (update: (current: GraphUiState) => GraphUiState) => {
      setStoredUi((current) =>
        update(
          current.workspaceId === workspaceId
            ? current
            : initialUiState(workspaceId),
        ),
      );
    },
    [workspaceId],
  );

  const issueCommand = useCallback(
    (type: GraphCommand["type"], nodeId?: string) => {
      commandId.current += 1;
      setCommand({ id: commandId.current, nodeId, type });
    },
    [],
  );
  const setNodeType = useCallback(
    (type: string) => {
      updateUi((current) => ({
        ...current,
        nodeType: type,
        selection: filterGraph(allGraph, type, current.selection).selection,
      }));
    },
    [allGraph, updateUi],
  );
  const selectNode = useCallback(
    (id: string) =>
      updateUi((current) => ({
        ...current,
        selection: { id, kind: "node" },
      })),
    [updateUi],
  );
  const selectEdge = useCallback(
    (id: string) =>
      updateUi((current) => ({
        ...current,
        selection: { id, kind: "edge" },
      })),
    [updateUi],
  );
  const focusNode = useCallback(
    (id: string) => {
      selectNode(id);
      updateUi((current) => ({ ...current, search: "" }));
      issueCommand("focus", id);
    },
    [issueCommand, selectNode, updateUi],
  );
  const normalizedSearch = ui.search.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      normalizedSearch
        ? filtered.graph.nodes
            .filter((node) => node.name.toLowerCase().includes(normalizedSearch))
            .slice(0, 5)
        : [],
    [filtered.graph.nodes, normalizedSearch],
  );
  const nodeTypes = useMemo(
    () => [...new Set(allGraph.nodes.map((node) => node.type))].sort(),
    [allGraph.nodes],
  );
  const selectedNode =
    selection?.kind === "node"
      ? filtered.graph.nodes.find((node) => node.id === selection.id) ?? null
      : null;
  const selectedEdge =
    selection?.kind === "edge"
      ? filtered.graph.edges.find((edge) => edge.id === selection.id) ?? null
      : null;
  const neighbors = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set<string>();
    filtered.graph.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });
    return filtered.graph.nodes.filter((node) => ids.has(node.id));
  }, [filtered.graph, selectedNode]);

  return {
    clearSelection: () =>
      updateUi((current) => ({ ...current, selection: null })),
    command,
    focusNode,
    graph: filtered.graph,
    issueCommand,
    neighbors,
    nodeType: ui.nodeType,
    nodeTypes,
    physicsEnabled: ui.physicsEnabled,
    query,
    search: ui.search,
    selectEdge,
    selectNode,
    selectedEdge,
    selectedNode,
    selection,
    setNodeType,
    setPhysicsEnabled: (physicsEnabled: boolean) =>
      updateUi((current) => ({ ...current, physicsEnabled })),
    setSearch: (search: string) =>
      updateUi((current) => ({ ...current, search })),
    suggestions,
  };
}
