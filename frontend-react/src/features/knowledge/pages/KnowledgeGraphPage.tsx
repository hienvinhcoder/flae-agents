import { ArrowLeft, Database, LoaderCircle, Network } from "lucide-react";
import { Link } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Toast } from "../../../shared/ui/Toast";
import { useGraphController } from "../graph/hooks/use-graph-controller";
import type { GraphSelection } from "../graph/types";
import { GraphCanvas } from "../graph/ui/GraphCanvas";
import { GraphFilters } from "../graph/ui/GraphFilters";
import { GraphSelectionPanel } from "../graph/ui/GraphSelectionPanel";
import { GraphToolbar } from "../graph/ui/GraphToolbar";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load the knowledge graph.";
}

export function KnowledgeGraphPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const controller = useGraphController(workspaceId);
  const onSelectionChange = (selection: GraphSelection | null) => {
    if (!selection) controller.clearSelection();
    else if (selection.kind === "node") controller.selectNode(selection.id);
    else controller.selectEdge(selection.id);
  };

  return (
    <section aria-labelledby="knowledge-graph-title" className="mx-auto w-full max-w-[96rem]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link aria-label="Back to knowledge base" className="mt-1 grid min-h-10 min-w-10 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink-secondary no-underline hover:bg-ui-interactive hover:text-ui-ink" to="/dashboard/knowledge">
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-metadata">Workspace intelligence / entity topology</p>
            <h1 className="mt-1 flex items-center gap-2 text-[1.75rem] font-bold text-ui-ink" id="knowledge-graph-title">
              <Network aria-hidden className="h-6 w-6 text-brand" />
              Knowledge graph
            </h1>
            <p className="mt-1 max-w-2xl text-ui-ink-secondary">Trace extracted entities, relationships, and evidence across workspace knowledge.</p>
          </div>
        </div>
        <div className="font-code text-xs text-ui-ink-muted">
          {controller.graph.nodes.length} visible nodes / {controller.graph.edges.length} visible edges
        </div>
      </header>

      <div className="surface-panel mt-5 overflow-hidden bg-ui-canvas">
        <div className="relative z-30 flex flex-col gap-3 border-b border-ui-divider bg-ui-panel/90 p-3 backdrop-blur xl:flex-row xl:items-end xl:justify-between">
          <GraphToolbar
            onCommand={(type) => controller.issueCommand(type)}
            onFocusNode={controller.focusNode}
            onSearchChange={controller.setSearch}
            search={controller.search}
            suggestions={controller.suggestions}
          />
          <GraphFilters
            nodeType={controller.nodeType}
            nodeTypes={controller.nodeTypes}
            onNodeTypeChange={controller.setNodeType}
            onPhysicsChange={controller.setPhysicsEnabled}
            physicsEnabled={controller.physicsEnabled}
          />
        </div>

        <div
          className="relative min-h-[32rem] overflow-hidden bg-ui-canvas"
          style={{
            backgroundImage:
              "linear-gradient(rgba(105,117,132,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(105,117,132,.08) 1px, transparent 1px), radial-gradient(circle at 50% 35%, rgba(242,140,69,.08), transparent 45%)",
            backgroundSize: "32px 32px, 32px 32px, auto",
          }}
        >
          <GraphCanvas
            command={controller.command}
            graph={controller.graph}
            onSelectionChange={onSelectionChange}
            physicsEnabled={controller.physicsEnabled}
            selection={controller.selection}
            workspaceKey={workspaceId ?? "none"}
          />

          {workspaceId && controller.query.isPending ? (
            <div aria-label="Loading knowledge graph" className="absolute inset-0 z-20 grid place-items-center bg-ui-canvas/85 backdrop-blur" role="status">
              <div className="text-center text-ui-ink-secondary">
                <LoaderCircle aria-hidden className="mx-auto h-9 w-9 animate-spin text-brand motion-reduce:animate-none" />
                <p className="mt-3 font-semibold">Loading knowledge graph</p>
              </div>
            </div>
          ) : null}

          {!workspaceId ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-md">
                <Database aria-hidden className="mx-auto h-10 w-10 text-ui-ink-disabled" />
                <h2 className="mt-4 text-lg font-bold text-ui-ink">Select a workspace</h2>
                <p className="mt-2 text-ui-ink-secondary">Select a workspace to explore its graph.</p>
              </div>
            </div>
          ) : controller.query.isSuccess && controller.graph.nodes.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="max-w-md">
                <Database aria-hidden className="mx-auto h-10 w-10 text-ui-ink-disabled" />
                <h2 className="mt-4 text-lg font-bold text-ui-ink">No graph data yet</h2>
                <p className="mt-2 text-ui-ink-secondary">Upload documents and wait for entity extraction to complete.</p>
                <Link className="button-primary mt-5 no-underline" to="/dashboard/knowledge">Open knowledge base</Link>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-ui-control border border-ui-divider bg-ui-panel/75 px-3 py-2 font-code text-[0.65rem] text-ui-ink-muted backdrop-blur sm:block">
            Wheel to zoom / drag canvas to pan / drag nodes to reposition
          </div>
          <GraphSelectionPanel
            neighbors={controller.neighbors}
            onClose={controller.clearSelection}
            onFocusNode={controller.focusNode}
            selectedEdge={controller.selectedEdge}
            selectedNode={controller.selectedNode}
          />
        </div>
      </div>

      {controller.query.isError ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <Toast message={errorMessage(controller.query.error)} tone="error" />
        </div>
      ) : null}
    </section>
  );
}
