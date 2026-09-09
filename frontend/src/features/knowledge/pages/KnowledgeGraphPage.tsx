import {
  ArrowLeft,
  Database,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Network,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
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
import { GraphLegend } from "../graph/ui/GraphLegend";
import { GraphSelectionPanel } from "../graph/ui/GraphSelectionPanel";
import { GraphToolbar } from "../graph/ui/GraphToolbar";

function publicErrorMessage(error: unknown, fallback: string) {
  void error;
  return fallback;
}

function isGloballyAnnouncedServerError(error: unknown) {
  return (
    error instanceof AppError &&
    error.kind === "server" &&
    (error.status ?? 0) >= 500
  );
}

export function KnowledgeGraphPage() {
  const { t } = useTranslation();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const controller = useGraphController(workspaceId);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const visibleNodesCount = controller.graph.nodes.length;
  const visibleEdgesCount = controller.graph.edges.length;

  return (
    <section
      aria-labelledby="knowledge-graph-title"
      className={`mx-auto w-full transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-ui-canvas p-3 sm:p-4 flex flex-col"
          : "max-w-384 px-4 sm:px-6 lg:px-8 py-5 sm:py-6"
      }`}
    >
      {/* Top Breadcrumb & Page Header */}
      {!isFullscreen && (
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-ui-control border border-ui-line bg-ui-raised/90 px-4 py-2 font-semibold text-xs text-ui-ink shadow-sm backdrop-blur-sm no-underline transition-all duration-200 hover:border-ui-line-strong hover:bg-ui-interactive hover:text-brand-text active:scale-95 motion-reduce:transition-none"
                to="/dashboard/knowledge"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                <span>{t("GRAPH.BACK_TO_KNOWLEDGE")}</span>
              </Link>
              <button
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui-control border border-ui-line bg-ui-raised/90 p-2 text-ui-ink-secondary shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-ui-line-strong hover:bg-ui-interactive hover:text-ui-ink active:scale-95 motion-reduce:transition-none"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                type="button"
              >
                {isFullscreen ? (
                  <Minimize2 aria-hidden className="h-4 w-4" />
                ) : (
                  <Maximize2 aria-hidden className="h-4 w-4" />
                )}
              </button>
            </div>
          }
          description={t("GRAPH.DESCRIPTION")}
          eyebrow={t("GRAPH.EYEBROW")}
          metadata={
            <div className="flex flex-wrap items-center gap-2 font-code text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ui-divider bg-ui-raised/80 px-2.5 py-1 text-ui-ink shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-chart-2 shadow-sm animate-pulse" />
                <strong className="font-semibold">{visibleNodesCount}</strong>
                <span className="text-ui-ink-muted">thực thể</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ui-divider bg-ui-raised/80 px-2.5 py-1 text-ui-ink shadow-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-chart-1 shadow-sm" />
                <strong className="font-semibold">{visibleEdgesCount}</strong>
                <span className="text-ui-ink-muted">liên kết</span>
              </span>
              <span className="sr-only">
                {t("GRAPH.VISIBLE_COUNTS", {
                  edges: visibleEdgesCount,
                  nodes: visibleNodesCount,
                })}
              </span>
            </div>
          }
          title={
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft border border-brand-text/30 shadow-glow-primary">
                <Network aria-hidden="true" className="h-5 w-5 text-brand-text" />
              </span>
              <span>{t("SHELL.KNOWLEDGE_GRAPH")}</span>
            </span>
          }
          titleId="knowledge-graph-title"
        />
      )}

      {/* Main Graph Work Surface */}
      <div
        className={`overflow-hidden rounded-2xl border border-ui-line bg-ui-panel/40 shadow-ui-panel backdrop-blur-md transition-all ${
          isFullscreen ? "flex-1 flex flex-col mt-0" : "mt-5 sm:mt-6"
        }`}
      >
        {/* Floating Dock / Top PageToolbar */}
        <PageToolbar
          ariaLabel={t("GRAPH.TOOLS_ARIA")}
          className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-ui-divider bg-ui-raised/85 px-4 py-3 backdrop-blur-md sm:px-5"
        >
          <GraphToolbar
            onCommand={(type) => controller.issueCommand(type)}
            onFocusNode={controller.focusNode}
            onSearchChange={controller.setSearch}
            search={controller.search}
            suggestions={controller.suggestions}
          />
          <div className="flex items-center gap-2">
            <GraphFilters
              nodeType={controller.nodeType}
              nodeTypes={controller.nodeTypes}
              onNodeTypeChange={controller.setNodeType}
              onPhysicsChange={controller.setPhysicsEnabled}
              physicsEnabled={controller.physicsEnabled}
            />
            {isFullscreen && (
              <button
                aria-label="Exit Fullscreen"
                className="grid min-h-11 min-w-11 place-items-center rounded-ui-control border border-ui-line bg-ui-raised text-ui-ink-secondary hover:text-ui-ink hover:bg-ui-interactive"
                onClick={() => setIsFullscreen(false)}
                title="Exit Fullscreen"
                type="button"
              >
                <Minimize2 aria-hidden className="h-4 w-4" />
              </button>
            )}
          </div>
        </PageToolbar>

        {/* Canvas Area with Interactive HUD */}
        <div
          className={`knowledge-graph-atmosphere relative overflow-hidden bg-ui-canvas ${
            isFullscreen
              ? "flex-1 h-full min-h-120"
              : "h-[calc(100dvh-18rem)] min-h-128"
          }`}
        >
          <GraphCanvas
            command={controller.command}
            graph={controller.graph}
            labels={graphCanvasLabels}
            onSelectionChange={onSelectionChange}
            physicsEnabled={controller.physicsEnabled}
            selection={controller.selection}
            workspaceKey={workspaceId ?? "none"}
          />

          {/* Loading State Overlay */}
          {workspaceId && controller.query.isPending ? (
            <div
              aria-label={t("GRAPH.LOADING")}
              className="absolute inset-0 z-20 grid place-items-center bg-ui-canvas/80 backdrop-blur-md transition-all duration-200"
              role="status"
            >
              <div className="text-center text-ui-ink-secondary">
                <div className="relative mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-brand-text/30 bg-brand-soft shadow-glow-primary">
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin text-brand-text motion-reduce:animate-none"
                  />
                </div>
                <p className="font-code text-xs uppercase tracking-widest font-semibold text-brand-text animate-pulse">
                  {t("GRAPH.LOADING")}
                </p>
              </div>
            </div>
          ) : null}

          {/* Prompt: Select a Workspace */}
          {!workspaceId ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center bg-ui-canvas/20 backdrop-blur-sm">
              <div className="max-w-md rounded-2xl border border-ui-line bg-ui-panel/95 p-8 shadow-ui-overlay auth-enter backdrop-blur-xl">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ui-line bg-ui-canvas/80 shadow-inner">
                  <Database aria-hidden="true" className="h-7 w-7 text-ui-ink-disabled" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-ui-ink tracking-tight">
                  {t("GRAPH.SELECT_WORKSPACE")}
                </h2>
                <p className="mt-2 text-sm text-ui-ink-secondary leading-relaxed">
                  {t("GRAPH.SELECT_WORKSPACE_DESCRIPTION")}
                </p>
              </div>
            </div>
          ) : controller.query.isSuccess && controller.graph.nodes.length === 0 ? (
            /* Prompt: Empty Graph */
            <div className="absolute inset-0 grid place-items-center p-6 text-center bg-ui-canvas/20 backdrop-blur-sm">
              <div className="max-w-md rounded-2xl border border-ui-line bg-ui-panel/95 p-8 shadow-ui-overlay auth-enter backdrop-blur-xl">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand-text/30 bg-brand-soft shadow-glow-primary">
                  <Sparkles aria-hidden="true" className="h-7 w-7 text-brand-text" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-ui-ink tracking-tight">
                  {t("GRAPH.EMPTY_TITLE")}
                </h2>
                <p className="mt-2 text-sm text-ui-ink-secondary leading-relaxed">
                  {t("GRAPH.EMPTY_DESCRIPTION")}
                </p>
                <Link
                  className="flae-button-primary mt-6 inline-flex items-center gap-2 shadow-glow-primary no-underline transition-transform active:scale-95"
                  to="/dashboard/knowledge"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  <span>{t("GRAPH.OPEN_KNOWLEDGE")}</span>
                </Link>
              </div>
            </div>
          ) : null}

          {/* Bottom Controls & Hints */}
          <div className="pointer-events-none absolute bottom-4 left-4 hidden rounded-xl border border-ui-line/70 bg-ui-panel/85 px-3.5 py-2 font-code text-[0.65rem] text-ui-ink-muted shadow-sm backdrop-blur-md sm:block">
            {t("GRAPH.GESTURE_HINT")}
          </div>

          {/* Interactive Legend Dock */}
          <GraphLegend
            nodes={controller.graph.nodes}
            onSelectType={controller.setNodeType}
            selectedType={controller.nodeType}
          />

          {/* Side Inspector Sheet */}
          <GraphSelectionPanel
            neighbors={controller.neighbors}
            onClose={controller.clearSelection}
            onFocusNode={controller.focusNode}
            selectedEdge={controller.selectedEdge}
            selectedNode={controller.selectedNode}
          />
        </div>
      </div>

      {/* Error Toast */}
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
