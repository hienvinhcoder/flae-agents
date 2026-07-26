import { buildGraphIndex, stepGraphPhysics } from "./graph-simulation";
import type {
  GraphCommand,
  GraphSelection,
  RendererEdge,
  RendererGraph,
  RendererNode,
} from "./types";

interface RendererState {
  graph: RendererGraph;
  physicsEnabled: boolean;
  selection: GraphSelection | null;
}

interface GraphRendererOptions {
  onActiveItemChange?: (selection: GraphSelection | null) => void;
  onSelectionChange: (selection: GraphSelection | null) => void;
}

export interface GraphRenderer {
  destroy: () => void;
  execute: (command: GraphCommand) => void;
  getView: () => { k: number; x: number; y: number };
  update: (state: RendererState) => void;
}

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const MAX_SIMULATION_FRAMES = 160;
const SETTLED_MOTION = 0.015;

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const position = lengthSquared
    ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared))
    : 0;
  return Math.hypot(x - (x1 + position * dx), y - (y1 + position * dy));
}

function edgeColor(edge: RendererEdge) {
  if (edge.tone === "danger") return "rgba(240, 123, 125, 0.58)";
  if (edge.tone === "warning") return "rgba(239, 189, 98, 0.58)";
  if (edge.tone === "success") return "rgba(100, 216, 146, 0.58)";
  if (edge.tone === "ai") return "rgba(173, 145, 255, 0.58)";
  return "rgba(197, 199, 203, 0.32)";
}

export function createGraphRenderer(
  canvas: HTMLCanvasElement,
  options: GraphRendererOptions,
): GraphRenderer {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D rendering is unavailable.");
  let state: RendererState = {
    graph: { edges: [], nodes: [] },
    physicsEnabled: true,
    selection: null,
  };
  let index = buildGraphIndex(state.graph);
  let view = { k: 1, x: 0, y: 0 };
  let rafId: number | null = null;
  let simulationFrames = 0;
  let destroyed = false;
  let draggingView = false;
  let draggedNode: RendererNode | null = null;
  let dragStart = { clientX: 0, clientY: 0, x: 0, y: 0 };
  let pinchStart: {
    distance: number;
    graphX: number;
    graphY: number;
  } | null = null;
  let activeIndex = -1;
  const pointers = new Map<number, { x: number; y: number }>();
  const brandColor =
    getComputedStyle(canvas).getPropertyValue("--color-primary").trim() ||
    "#fb923c";

  const canvasPoint = (event: PointerEvent | WheelEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const graphPoint = (point: { x: number; y: number }) => ({
    x: (point.x - view.x) / view.k,
    y: (point.y - view.y) / view.k,
  });
  const navigationItems = (): GraphSelection[] => [
    ...state.graph.nodes.map((node) => ({ id: node.id, kind: "node" as const })),
    ...state.graph.edges.map((edge) => ({ id: edge.id, kind: "edge" as const })),
  ];
  const resetView = () => {
    if (!state.graph.nodes.length) {
      view = { k: 1, x: 0, y: 0 };
      return;
    }
    const xs = state.graph.nodes.map((node) => node.x);
    const ys = state.graph.nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.max(
      0.2,
      Math.min(
        (canvas.width - 80) / (maxX - minX || 100),
        (canvas.height - 80) / (maxY - minY || 100),
        1.2,
      ),
    );
    view = {
      k: scale,
      x: canvas.width / 2 - ((minX + maxX) / 2) * scale,
      y: canvas.height / 2 - ((minY + maxY) / 2) * scale,
    };
  };
  const zoomAt = (x: number, y: number, nextZoom: number) => {
    const graphX = (x - view.x) / view.k;
    const graphY = (y - view.y) / view.k;
    const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    view = { k, x: x - graphX * k, y: y - graphY * k };
  };

  const drawEdge = (edge: RendererEdge) => {
    const source = index.nodesById.get(edge.source);
    const target = index.nodesById.get(edge.target);
    if (!source || !target) return;
    const selected = state.selection?.kind === "edge" && state.selection.id === edge.id;
    const related =
      state.selection?.kind === "node" &&
      (state.selection.id === edge.source || state.selection.id === edge.target);
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = selected
      ? brandColor
      : related
        ? "rgba(242, 140, 69, 0.68)"
        : edgeColor(edge);
    context.lineWidth = selected ? 3 : related ? 2 : 1;
    context.setLineDash(edge.dashed && !selected && !related ? [5, 5] : []);
    context.stroke();
    context.setLineDash([]);
    if (view.k <= 0.7 && !selected) return;
    const x = (source.x + target.x) / 2;
    const y = (source.y + target.y) / 2;
    context.font = "10px monospace";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    const width = context.measureText(edge.displayLabel).width;
    context.fillStyle = "rgba(13, 15, 18, 0.88)";
    context.fillRect(x - width / 2 - 4, y - 13, width + 8, 15);
    context.fillStyle = selected ? brandColor : "rgba(197, 199, 203, 0.82)";
    context.fillText(edge.displayLabel, x, y);
  };
  const drawNode = (node: RendererNode) => {
    const selected = state.selection?.kind === "node" && state.selection.id === node.id;
    const neighbor =
      state.selection?.kind === "node" &&
      index.neighborsById.get(state.selection.id)?.has(node.id);
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fillStyle = node.color;
    context.shadowColor = node.color;
    context.shadowBlur = selected ? 18 : neighbor ? 9 : 0;
    context.fill();
    context.strokeStyle = selected ? "#f4f2ee" : neighbor ? "#c5c7cb" : "#303640";
    context.lineWidth = selected ? 3 : neighbor ? 2 : 1;
    context.stroke();
    context.shadowBlur = 0;
    context.font = selected ? "bold 12px sans-serif" : "11px sans-serif";
    context.fillStyle = selected ? "#f4f2ee" : "#c5c7cb";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(node.name, node.x, node.y + node.radius + 7);
  };
  const draw = () => {
    if (destroyed) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(view.x, view.y);
    context.scale(view.k, view.k);
    state.graph.edges.forEach(drawEdge);
    state.graph.nodes.forEach(drawNode);
    context.restore();
  };
  const stopSimulation = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
  const tick = () => {
    rafId = null;
    if (destroyed || !state.physicsEnabled || !state.graph.nodes.length) return;
    const motion = stepGraphPhysics(
      state.graph,
      index,
      canvas.width,
      canvas.height,
    );
    simulationFrames += 1;
    draw();
    if (simulationFrames < MAX_SIMULATION_FRAMES && motion > SETTLED_MOTION) {
      rafId = requestAnimationFrame(tick);
    }
  };
  const wakeSimulation = () => {
    if (!state.physicsEnabled || !state.graph.nodes.length || destroyed) return;
    simulationFrames = 0;
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  const select = (selection: GraphSelection | null) => {
    state = { ...state, selection };
    options.onSelectionChange(selection);
    draw();
  };
  const hitNode = (point: { x: number; y: number }) =>
    [...state.graph.nodes]
      .reverse()
      .find((node) => Math.hypot(point.x - node.x, point.y - node.y) <= node.radius);
  const hitEdge = (point: { x: number; y: number }) =>
    state.graph.edges.find((edge) => {
      const source = index.nodesById.get(edge.source);
      const target = index.nodesById.get(edge.target);
      return Boolean(
        source &&
          target &&
          distanceToSegment(point.x, point.y, source.x, source.y, target.x, target.y) <
            6 / view.k,
      );
    });
  const startPinch = () => {
    const points = [...pointers.values()];
    const first = points[0];
    const second = points[1];
    if (!first || !second) return;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const graphMidpoint = graphPoint(midpoint);
    pinchStart = {
      distance: Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1),
      graphX: graphMidpoint.x,
      graphY: graphMidpoint.y,
    };
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      draggedNode = null;
    }
    draggingView = false;
  };
  const onPointerDown = (event: PointerEvent) => {
    const point = canvasPoint(event);
    pointers.set(event.pointerId, point);
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      startPinch();
      return;
    }
    const graphPosition = graphPoint(point);
    const node = hitNode(graphPosition);
    if (node) {
      draggedNode = node;
      node.fx = node.x;
      node.fy = node.y;
      select({ id: node.id, kind: "node" });
      return;
    }
    const edge = hitEdge(graphPosition);
    if (edge) {
      select({ id: edge.id, kind: "edge" });
      return;
    }
    draggingView = true;
    dragStart = { clientX: point.x, clientY: point.y, x: view.x, y: view.y };
    select(null);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    const point = canvasPoint(event);
    pointers.set(event.pointerId, point);
    if (pointers.size === 2 && pinchStart) {
      const points = [...pointers.values()];
      const first = points[0];
      const second = points[1];
      if (!first || !second) return;
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
      const k = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, view.k * (distance / pinchStart.distance)),
      );
      view = {
        k,
        x: midpoint.x - pinchStart.graphX * k,
        y: midpoint.y - pinchStart.graphY * k,
      };
      pinchStart = { ...pinchStart, distance };
      draw();
      return;
    }
    if (draggedNode) {
      const position = graphPoint(point);
      draggedNode.fx = position.x;
      draggedNode.fy = position.y;
      draggedNode.x = position.x;
      draggedNode.y = position.y;
      draw();
      wakeSimulation();
    } else if (draggingView) {
      view = {
        ...view,
        x: dragStart.x + point.x - dragStart.clientX,
        y: dragStart.y + point.y - dragStart.clientY,
      };
      draw();
    }
  };
  const finishPointer = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    canvas.releasePointerCapture(event.pointerId);
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      draggedNode = null;
      wakeSimulation();
    }
    draggingView = false;
    if (pointers.size < 2) pinchStart = null;
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const point = canvasPoint(event);
    zoomAt(point.x, point.y, view.k * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    draw();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const items = navigationItems();
    if (event.key === "Escape") {
      event.preventDefault();
      activeIndex = -1;
      options.onActiveItemChange?.(null);
      select(null);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      if (!items.length) return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      activeIndex = activeIndex < 0
        ? step > 0 ? 0 : items.length - 1
        : (activeIndex + step + items.length) % items.length;
      options.onActiveItemChange?.(items[activeIndex] ?? null);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && activeIndex >= 0) {
      const active = items[activeIndex];
      if (!active) return;
      event.preventDefault();
      select(active);
      if (active.kind === "node") {
        const node = index.nodesById.get(active.id);
        if (node) {
          view = {
            k: 1.5,
            x: canvas.width / 2 - node.x * 1.5,
            y: canvas.height / 2 - node.y * 1.5,
          };
          draw();
        }
      }
    }
  };
  const resize = () => {
    const parent = canvas.parentElement;
    canvas.width = parent?.clientWidth || 800;
    canvas.height = parent?.clientHeight || 600;
    draw();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement ?? canvas);
  resize();
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKeyDown);

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      stopSimulation();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKeyDown);
    },
    execute: (command) => {
      if (command.type === "reset") resetView();
      if (command.type === "zoom-in") zoomAt(canvas.width / 2, canvas.height / 2, view.k * 1.2);
      if (command.type === "zoom-out") zoomAt(canvas.width / 2, canvas.height / 2, view.k / 1.2);
      if (command.type === "focus") {
        const node = index.nodesById.get(command.nodeId ?? "");
        if (node) {
          view = {
            k: 1.5,
            x: canvas.width / 2 - node.x * 1.5,
            y: canvas.height / 2 - node.y * 1.5,
          };
        }
      }
      draw();
    },
    getView: () => ({ ...view }),
    update: (nextState) => {
      const previousGraph = state.graph;
      const previousPhysics = state.physicsEnabled;
      const shouldFit = previousGraph.nodes.length === 0 && nextState.graph.nodes.length > 0;
      state = nextState;
      if (previousGraph !== nextState.graph) {
        index = buildGraphIndex(nextState.graph);
        const items = navigationItems();
        if (activeIndex >= items.length) {
          activeIndex = -1;
          options.onActiveItemChange?.(null);
        }
      }
      if (shouldFit) resetView();
      draw();
      if (!nextState.physicsEnabled) stopSimulation();
      else if (previousGraph !== nextState.graph || !previousPhysics) wakeSimulation();
    },
  };
}
