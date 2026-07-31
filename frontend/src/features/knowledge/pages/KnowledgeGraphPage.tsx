import { ArrowLeft, Database, LoaderCircle, Network } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { AppError } from "../../../core/api/errors";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { PageToolbar } from "../../../shared/ui/PageToolbar";
import { Toast } from "../../../shared/ui/Toast";
import { useGraphController } from "../graph/hooks/use-graph-controller";
import type { GraphSelection } from "../graph/types";
import { GraphCanvas, type GraphCanvasLabels } from "../graph/ui/GraphCanvas";
import { GraphFilters } from "../graph/ui/GraphFilters";
import { GraphSelectionPanel } from "../graph/ui/GraphSelectionPanel";
import { GraphToolbar } from "../graph/ui/GraphToolbar";

function publicErrorMessage(error: unknown, fallback: string) {
  void error;
  return fallback;
}

function isGloballyAnnouncedServerError(error: unknown) {
  return error instanceof AppError
    && error.kind === "server"
    && (error.status ?? 0) >= 500;
}

export function KnowledgeGraphPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const controller = useGraphController(workspaceId);
  const graphCanvasLabels: GraphCanvasLabels = {
    ariaLabel: t("SHELL.KNOWLEDGE_GRAPH"),
    fallbackText: `${t("SHELL.KNOWLEDGE_GRAPH")}. ${t("GRAPH.DESCRIPTION")}`,
    instructions: `${t("GRAPH.DESCRIPTION")} ${t("GRAPH.VIEW_CONTROLS")}: Arrow, Enter, Space, Escape. ${t("GRAPH.GESTURE_HINT")} ${t("GRAPH.ZOOM_IN")}; ${t("GRAPH.ZOOM_OUT")}; ${t("GRAPH.FIT_GRAPH")}.`,
    navigationPrefix: t("GRAPH.VIEW_CONTROLS"),
    nodeLabel: t("GRAPH.ENTITY_DETAILS"),
    relationshipLabel: t("GRAPH.RELATIONSHIP_DETAILS"),
    selectionPrefix: t("SHELL.KNOWLEDGE_GRAPH"),
  };
  const onSelectionChange = (selection: GraphSelection | null) => {
    if (!selection) controller.clearSelection();
    else if (selection.kind === "node") controller.selectNode(selection.id);
    else controller.selectEdge(selection.id);
  };

  return (
    <section aria-labelledby="knowledge-graph-title" className="mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        actions={(
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-ui-control border border-ui-line bg-ui-raised px-4.5 py-2 font-semibold text-ui-ink-secondary no-underline transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink motion-reduce:transition-none"
            to="/dashboard/knowledge"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t("GRAPH.BACK_TO_KNOWLEDGE")}
          </Link>
        )}
        description={t("GRAPH.DESCRIPTION")}
        eyebrow={t("GRAPH.EYEBROW")}
        metadata={t("GRAPH.VISIBLE_COUNTS", {
          edges: controller.graph.edges.length,
          nodes: controller.graph.nodes.length,
        })}
        title={(
          <span className="flex items-center gap-2">
            <Network aria-hidden className="h-6 w-6 text-brand-text" />
            {t("SHELL.KNOWLEDGE_GRAPH")}
          </span>
        )}
        titleId="knowledge-graph-title"
      />

      <div className="mt-6 overflow-hidden rounded-ui-dialog border border-ui-divider bg-ui-panel/40 shadow-ui-panel backdrop-blur-md">
        <PageToolbar ariaLabel={t("GRAPH.TOOLS_ARIA")} className="relative z-30 border-b border-ui-divider bg-ui-raised/85 backdrop-blur-sm px-4 py-3.5">
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
        </PageToolbar>

        <div className="knowledge-graph-atmosphere relative h-[calc(100dvh-18rem)] min-h-[32rem] overflow-hidden bg-ui-canvas">
          <GraphCanvas
            command={controller.command}
            graph={controller.graph}
            labels={graphCanvasLabels}
            onSelectionChange={onSelectionChange}
            physicsEnabled={controller.physicsEnabled}
            selection={controller.selection}
            workspaceKey={workspaceId ?? "none"}
          />

          {workspaceId && controller.query.isPending ? (
            <div aria-label={t("GRAPH.LOADING")} className="absolute inset-0 z-20 grid place-items-center bg-ui-canvas/80 backdrop-blur-md transition-all duration-200" role="status">
              <div className="text-center text-ui-ink-secondary">
                <LoaderCircle aria-hidden className="mx-auto h-9 w-9 animate-spin text-brand-text motion-reduce:animate-none" />
                <p className="mt-3 font-code text-xs uppercase tracking-wider font-semibold text-brand-text animate-pulse">{t("GRAPH.LOADING")}</p>
              </div>
            </div>
          ) : null}

          {!workspaceId ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center bg-ui-canvas/10 backdrop-blur-sm">
              <div className="max-w-md rounded-2xl border border-ui-divider bg-ui-panel/90 backdrop-blur px-8 py-10 shadow-ui-overlay auth-enter">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ui-canvas/80 border border-ui-divider shadow-sm">
                  <Database aria-hidden className="h-6 w-6 text-ui-ink-disabled" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-ui-ink">{t("GRAPH.SELECT_WORKSPACE")}</h2>
                <p className="mt-2.5 text-sm text-ui-ink-secondary leading-relaxed">{t("GRAPH.SELECT_WORKSPACE_DESCRIPTION")}</p>
              </div>
            </div>
          ) : controller.query.isSuccess && controller.graph.nodes.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center bg-ui-canvas/10 backdrop-blur-sm">
              <div className="max-w-md rounded-2xl border border-ui-divider bg-ui-panel/90 backdrop-blur px-8 py-10 shadow-ui-overlay auth-enter">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ui-canvas/80 border border-ui-divider shadow-sm">
                  <Database aria-hidden className="h-6 w-6 text-ui-ink-disabled" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-ui-ink">{t("GRAPH.EMPTY_TITLE")}</h2>
                <p className="mt-2.5 text-sm text-ui-ink-secondary leading-relaxed">{t("GRAPH.EMPTY_DESCRIPTION")}</p>
                <Link className="flae-button-primary mt-6 inline-flex items-center gap-2 no-underline" to="/dashboard/knowledge">
                  {t("GRAPH.OPEN_KNOWLEDGE")}
                </Link>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-4 left-4 hidden rounded-lg border border-ui-divider bg-ui-panel/90 backdrop-blur px-3 py-2 font-code text-[0.62rem] text-ui-ink-muted shadow-sm sm:block">
            {t("GRAPH.GESTURE_HINT")}
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

      {controller.query.isError && !isGloballyAnnouncedServerError(controller.query.error) ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <Toast
            message={publicErrorMessage(controller.query.error, t("GRAPH.LOAD_ERROR"))}
            tone="error"
          />
        </div>
      ) : null}
    </section>
  );
}
