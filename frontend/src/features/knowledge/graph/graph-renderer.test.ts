import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createGraphRenderer } from "./graph-renderer";
import type { RendererGraph } from "./types";

const graph: RendererGraph = {
  edges: [
    {
      dashed: false,
      description: "Owns",
      displayLabel: "OWNS",
      id: "edge-1",
      label: "OWNS",
      source: "node-1",
      target: "node-2",
      tone: "default",
      weight: 1,
    },
  ],
  nodes: [
    {
      color: "var(--chart-1)",
      degree: 1,
      frequency: 1,
      fx: null,
      fy: null,
      id: "node-1",
      name: "Ada",
      radius: 20,
      type: "person",
      vx: 0,
      vy: 0,
      x: 100,
      y: 100,
    },
    {
      color: "var(--chart-3)",
      degree: 1,
      frequency: 1,
      fx: null,
      fy: null,
      id: "node-2",
      name: "FLAE",
      radius: 20,
      type: "company",
      vx: 0,
      vy: 0,
      x: 300,
      y: 100,
    },
  ],
};

function contextStub() {
  const gradient = { addColorStop: vi.fn() };
  const styles = {
    fill: [] as Array<CanvasRenderingContext2D["fillStyle"]>,
    stroke: [] as Array<CanvasRenderingContext2D["strokeStyle"]>,
  };
  let fillStyle: CanvasRenderingContext2D["fillStyle"] = "";
  let strokeStyle: CanvasRenderingContext2D["strokeStyle"] = "";
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    fillRect: vi.fn(),
    get fillStyle() { return fillStyle; },
    set fillStyle(value) { fillStyle = value; styles.fill.push(value); },
    fillText: vi.fn(),
    font: "",
    lineTo: vi.fn(),
    lineWidth: 1,
    measureText: vi.fn(() => ({ width: 24 })),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    shadowBlur: 0,
    shadowColor: "",
    stroke: vi.fn(),
    get strokeStyle() { return strokeStyle; },
    set strokeStyle(value) { strokeStyle = value; styles.stroke.push(value); },
    textAlign: "",
    textBaseline: "",
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return { context, styles };
}

let resizeCallback: ResizeObserverCallback;
const disconnect = vi.fn();
const observe = vi.fn();
let rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRaf = 1;
const canvasClearRects = new WeakMap<HTMLCanvasElement, ReturnType<typeof vi.fn>>();
const canvasDrawStyles = new WeakMap<HTMLCanvasElement, ReturnType<typeof contextStub>["styles"]>();
const canvasPointerCaptures = new WeakMap<
  HTMLCanvasElement,
  { release: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }
>();

beforeEach(() => {
  disconnect.mockReset();
  observe.mockReset();
  rafCallbacks = new Map();
  nextRaf = 1;
  Object.assign(graph.nodes[0]!, { fx: null, fy: null, vx: 0, vy: 0, x: 100, y: 100 });
  Object.assign(graph.nodes[1]!, { fx: null, fy: null, vx: 0, vy: 0, x: 300, y: 100 });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      disconnect = disconnect;
      observe = observe;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextRaf++;
    rafCallbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => rafCallbacks.delete(id));
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      readonly pointerId: number;
      readonly pointerType: string;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.pointerType = init.pointerType ?? "mouse";
      }
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

function createCanvas(width = 800, height = 600) {
  const parent = document.createElement("div");
  const canvas = document.createElement("canvas");
  parent.append(canvas);
  Object.defineProperties(parent, {
    clientHeight: { configurable: true, value: height },
    clientWidth: { configurable: true, value: width },
  });
  const { context, styles } = contextStub();
  const clearRect = vi.fn();
  context.clearRect = clearRect;
  canvasClearRects.set(canvas, clearRect);
  canvasDrawStyles.set(canvas, styles);
  Object.defineProperty(canvas, "getContext", {
    configurable: true,
    value: vi.fn(() => context),
  });
  const pointerCapture = { release: vi.fn(), set: vi.fn() };
  canvasPointerCaptures.set(canvas, pointerCapture);
  Object.defineProperties(canvas, {
    releasePointerCapture: { configurable: true, value: pointerCapture.release },
    setPointerCapture: { configurable: true, value: pointerCapture.set },
  });
  canvas.getBoundingClientRect = vi.fn(() => ({
    bottom: height,
    height,
    left: 0,
    right: width,
    toJSON: () => undefined,
    top: 0,
    width,
    x: 0,
    y: 0,
  }));
  return canvas;
}

function screenPoint(
  renderer: ReturnType<typeof createGraphRenderer>,
  x: number,
  y: number,
) {
  const view = renderer.getView();
  return { clientX: view.x + x * view.k, clientY: view.y + y * view.k };
}

describe("graph renderer", () => {
  it("uses semantic canvas colors for readable edges, labels, and node strokes", () => {
    const canvas = createCanvas();
    const colors = {
      "--color-ai": "#060606",
      "--color-border-control": "#020202",
      "--color-border-strong": "#0c0c0c",
      "--color-danger": "#030303",
      "--color-focus": "#0b0b0b",
      "--color-link": "#080808",
      "--color-primary": "#010101",
      "--color-success": "#050505",
      "--color-surface-raised": "#070707",
      "--color-text": "#090909",
      "--color-text-secondary": "#0a0a0a",
      "--color-warning": "#040404",
      "--chart-1": "#0d0d0d", "--chart-3": "#0e0e0e",
    } as const;
    for (const [token, value] of Object.entries(colors)) {
      canvas.style.setProperty(token, value);
    }
    const tones = ["default", "danger", "warning", "success", "ai"] as const;
    const themedGraph: RendererGraph = {
      ...graph,
      edges: tones.map((tone, index) => ({
        ...graph.edges[0]!,
        id: `edge-${index}`,
        tone,
      })),
    };
    const renderer = createGraphRenderer(canvas, { onSelectionChange: vi.fn() });

    renderer.update({ graph: themedGraph, physicsEnabled: false, selection: null });
    renderer.update({ graph: themedGraph, physicsEnabled: false, selection: { id: "edge-4", kind: "edge" } });
    renderer.update({ graph: themedGraph, physicsEnabled: false, selection: { id: "node-1", kind: "node" } });

    const styles = canvasDrawStyles.get(canvas);
    expect(styles?.stroke).toEqual(
      expect.arrayContaining([
        colors["--color-primary"],
        colors["--color-border-control"],
        colors["--color-border-strong"],
        colors["--color-danger"],
        colors["--color-warning"],
        colors["--color-success"],
        colors["--color-ai"],
        colors["--color-focus"],
      ]),
    );
    expect(styles?.fill).toEqual(
      expect.arrayContaining([
        colors["--color-surface-raised"],
        colors["--color-link"],
        colors["--color-text"],
        colors["--color-text-secondary"],
        colors["--chart-1"],
        colors["--chart-3"],
      ]),
    );
  });

  it("GRAPH-02A/02B supports touch selection, pan, node drag, and bounded pinch zoom", () => {
    const canvas = createCanvas();
    const onSelectionChange = vi.fn();
    const renderer = createGraphRenderer(canvas, { onSelectionChange });
    renderer.update({ graph, physicsEnabled: false, selection: null });
    const firstNode = screenPoint(renderer, 100, 100);
    const edge = screenPoint(renderer, 200, 100);

    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...firstNode, pointerId: 1, pointerType: "touch" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ id: "node-1", kind: "node" });
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...firstNode, pointerId: 1, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...edge, pointerId: 2, pointerType: "touch" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ id: "edge-1", kind: "edge" });
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...edge, pointerId: 2, pointerType: "touch" }));

    const beforePan = renderer.getView();
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 700, clientY: 500, pointerId: 3, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 730, clientY: 540, pointerId: 3, pointerType: "touch" }));
    expect(renderer.getView()).toMatchObject({ x: beforePan.x + 30, y: beforePan.y + 40 });
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 730, clientY: 540, pointerId: 3, pointerType: "touch" }));

    renderer.execute({ id: 1, nodeId: "node-1", type: "focus" });
    const oldX = graph.nodes[0]!.x;
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 400, clientY: 300, pointerId: 4, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 450, clientY: 350, pointerId: 4, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 450, clientY: 350, pointerId: 4, pointerType: "touch" }));
    expect(graph.nodes[0]!.x).not.toBe(oldX);

    renderer.execute({ id: 2, type: "reset" });
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 450, pointerId: 5, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 200, clientY: 450, pointerId: 6, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 1200, clientY: 450, pointerId: 6, pointerType: "touch" }));
    expect(renderer.getView().k).toBe(5);
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 1200, clientY: 450, pointerId: 6, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 100, clientY: 450, pointerId: 5, pointerType: "touch" }));
    renderer.execute({ id: 3, type: "reset" });
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 450, pointerId: 7, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 300, clientY: 450, pointerId: 8, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 101, clientY: 450, pointerId: 8, pointerType: "touch" }));
    expect(renderer.getView().k).toBe(0.15);
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 101, clientY: 450, pointerId: 8, pointerType: "touch" }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 100, clientY: 450, pointerId: 7, pointerType: "touch" }));
    expect(canvasPointerCaptures.get(canvas)?.set).toHaveBeenCalled();
    expect(canvasPointerCaptures.get(canvas)?.release).toHaveBeenCalled();
  });

  it("GRAPH-02A supports keyboard navigation across nodes and edges and Escape clear", () => {
    const canvas = createCanvas();
    const onActiveItemChange = vi.fn();
    const onSelectionChange = vi.fn();
    const renderer = createGraphRenderer(canvas, {
      onActiveItemChange,
      onSelectionChange,
    });
    renderer.update({ graph, physicsEnabled: false, selection: null });

    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(onActiveItemChange).toHaveBeenLastCalledWith({ id: "node-1", kind: "node" });
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ id: "node-1", kind: "node" });
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(onActiveItemChange).toHaveBeenLastCalledWith({ id: "edge-1", kind: "edge" });
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ id: "edge-1", kind: "edge" });
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(onActiveItemChange).toHaveBeenLastCalledWith(null);
  });

  it("GRAPH-02A selects visible nodes, edges, and deselects blank canvas", () => {
    const canvas = createCanvas();
    const onSelectionChange = vi.fn();
    const renderer = createGraphRenderer(canvas, { onSelectionChange });
    renderer.update({ graph, physicsEnabled: false, selection: null });

    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...screenPoint(renderer, 100, 100), pointerId: 10 }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ kind: "node", id: "node-1" });
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...screenPoint(renderer, 100, 100), pointerId: 10 }));
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...screenPoint(renderer, 200, 100), pointerId: 11 }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ kind: "edge", id: "edge-1" });
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...screenPoint(renderer, 200, 100), pointerId: 11 }));
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 700, clientY: 500, pointerId: 12 }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it("GRAPH-02B bounds wheel zoom and supports view and node dragging", () => {
    const canvas = createCanvas();
    const renderer = createGraphRenderer(canvas, { onSelectionChange: vi.fn() });
    renderer.update({ graph, physicsEnabled: false, selection: null });

    for (let index = 0; index < 80; index += 1) {
      canvas.dispatchEvent(new WheelEvent("wheel", { clientX: 400, clientY: 300, deltaY: -1 }));
    }
    expect(renderer.getView().k).toBe(5);
    for (let index = 0; index < 160; index += 1) {
      canvas.dispatchEvent(new WheelEvent("wheel", { clientX: 400, clientY: 300, deltaY: 1 }));
    }
    expect(renderer.getView().k).toBe(0.15);

    renderer.execute({ id: 1, type: "reset" });
    const beforePan = renderer.getView();
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 700, clientY: 500, pointerId: 20 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 730, clientY: 540, pointerId: 20 }));
    expect(renderer.getView()).toMatchObject({ x: beforePan.x + 30, y: beforePan.y + 40 });
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 730, clientY: 540, pointerId: 20 }));

    renderer.execute({ id: 2, nodeId: "node-1", type: "focus" });
    canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX: 400, clientY: 300, pointerId: 21 }));
    canvas.dispatchEvent(new PointerEvent("pointermove", { clientX: 450, clientY: 350, pointerId: 21 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { clientX: 450, clientY: 350, pointerId: 21 }));
    expect(typeof graph.nodes[0]?.x).toBe("number");
    expect(typeof graph.nodes[0]?.y).toBe("number");
    expect(graph.nodes[0]?.x).not.toBe(100);
  });

  it("GRAPH-02C focuses nodes and reset fits the visible graph", () => {
    const renderer = createGraphRenderer(createCanvas(), { onSelectionChange: vi.fn() });
    renderer.update({ graph, physicsEnabled: false, selection: null });

    renderer.execute({ id: 1, nodeId: "node-2", type: "focus" });
    expect(renderer.getView()).toEqual({ k: 1.5, x: -50, y: 150 });
    renderer.execute({ id: 2, type: "reset" });
    expect(renderer.getView().k).toBeGreaterThanOrEqual(0.2);
    expect(renderer.getView().k).toBeLessThanOrEqual(1.2);
  });

  it("GRAPH-01 auto-fits the first graph on a narrow canvas without resetting later views", () => {
    const canvas = createCanvas(320, 480);
    const renderer = createGraphRenderer(canvas, { onSelectionChange: vi.fn() });
    const singleNodeGraph: RendererGraph = {
      edges: [],
      nodes: [{ ...graph.nodes[0]!, x: 400, y: 300 }],
    };

    renderer.update({ graph: singleNodeGraph, physicsEnabled: false, selection: null });
    const firstView = renderer.getView();
    const nodeScreenX = firstView.x + 400 * firstView.k;
    const nodeScreenY = firstView.y + 300 * firstView.k;
    expect(nodeScreenX).toBeGreaterThanOrEqual(singleNodeGraph.nodes[0]!.radius);
    expect(nodeScreenX).toBeLessThanOrEqual(320 - singleNodeGraph.nodes[0]!.radius);
    expect(nodeScreenY).toBeGreaterThanOrEqual(singleNodeGraph.nodes[0]!.radius);
    expect(nodeScreenY).toBeLessThanOrEqual(480 - singleNodeGraph.nodes[0]!.radius);

    renderer.execute({ id: 1, nodeId: "node-1", type: "focus" });
    const focusedView = renderer.getView();
    renderer.update({
      graph: { ...singleNodeGraph, edges: [] },
      physicsEnabled: false,
      selection: { id: "node-1", kind: "node" },
    });
    expect(renderer.getView()).toEqual(focusedView);
  });

  it("GRAPH-06 does not recur RAF while physics is paused", () => {
    const renderer = createGraphRenderer(createCanvas(), { onSelectionChange: vi.fn() });
    renderer.update({ graph, physicsEnabled: false, selection: null });
    expect(rafCallbacks.size).toBe(0);
  });

  it("GRAPH-06 wakes physics and settles within a bounded frame budget", () => {
    const renderer = createGraphRenderer(createCanvas(), { onSelectionChange: vi.fn() });
    renderer.update({ graph, physicsEnabled: true, selection: null });
    let frames = 0;
    while (rafCallbacks.size && frames < 250) {
      const entry = rafCallbacks.entries().next().value;
      if (!entry) break;
      rafCallbacks.delete(entry[0]);
      entry[1](frames * 16);
      frames += 1;
    }
    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThanOrEqual(180);
    expect(rafCallbacks.size).toBe(0);
  });

  it("GRAPH-06 releases RAF, exact listeners, observer, and stops drawing", () => {
    const canvas = createCanvas();
    const removeEventListener = vi.spyOn(canvas, "removeEventListener");
    const clearRect = canvasClearRects.get(canvas);
    if (!clearRect) throw new Error("Missing canvas clearRect fake");
    const renderer = createGraphRenderer(canvas, { onSelectionChange: vi.fn() });
    renderer.update({ graph, physicsEnabled: true, selection: null });
    resizeCallback([], {} as ResizeObserver);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    const pendingCallback = [...rafCallbacks.values()][0];
    const drawsBeforeDestroy = clearRect.mock.calls.length;

    renderer.destroy();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledTimes(6);
    expect(rafCallbacks.size).toBe(0);
    pendingCallback?.(16);
    expect(clearRect).toHaveBeenCalledTimes(drawsBeforeDestroy);
  });
});
