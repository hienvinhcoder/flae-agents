import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import en from "../../../../../public/assets/i18n/en.json";
import viTranslations from "../../../../../public/assets/i18n/vi.json";
import { TestI18nProvider } from "../../../../../tests/TestI18nProvider";
import { createI18n } from "../../../../shared/i18n";
import type { RendererEdge, RendererNode } from "../types";
import { GraphFilters } from "./GraphFilters";
import { GraphSelectionPanel } from "./GraphSelectionPanel";
import { GraphToolbar } from "./GraphToolbar";

const node: RendererNode = {
  color: "#fb7185",
  degree: 1,
  description: "Founder",
  frequency: 4,
  fx: null,
  fy: null,
  id: "node-1",
  name: "Ada",
  radius: 26,
  type: "person",
  vx: 0,
  vy: 0,
  x: 100,
  y: 100,
};
const neighbor: RendererNode = {
  ...node,
  color: "#60a5fa",
  id: "node-2",
  name: "FLAE",
  type: "company",
};
const edge: RendererEdge = {
  dashed: false,
  description: "Current relationship",
  displayLabel: "FOUNDED",
  id: "edge-1",
  label: "OLD, FOUNDED",
  source: "node-1",
  target: "node-2",
  tone: "default",
  weight: 2,
};

function renderControl(ui: ReactElement) {
  return render(ui, { wrapper: TestI18nProvider });
}

const viI18n = await createI18n(
  { en: { translation: en }, vi: { translation: viTranslations } },
  "vi",
);

function renderVietnameseControl(ui: ReactElement) {
  return render(<I18nextProvider i18n={viI18n}>{ui}</I18nextProvider>);
}

describe("graph controls", () => {
  it("uses 44px targets for graph view controls", () => {
    renderControl(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search=""
        suggestions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /zoom in/i }).className).toContain(
      "min-h-11",
    );
    expect(screen.getByRole("button", { name: /zoom in/i }).className).toContain(
      "min-w-11",
    );
    expect(screen.getByRole("searchbox", { name: /search entities/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
  });

  it("uses 44px targets across filters and graph details", () => {
    renderControl(
      <>
        <GraphFilters
          nodeType="all"
          nodeTypes={["person"]}
          onNodeTypeChange={vi.fn()}
          onPhysicsChange={vi.fn()}
          physicsEnabled
        />
        <GraphSelectionPanel
          neighbors={[neighbor]}
          onClose={vi.fn()}
          onFocusNode={vi.fn()}
          selectedEdge={null}
          selectedNode={node}
        />
      </>,
    );

    expect(screen.getByRole("combobox", { name: /entity type/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: /physics on/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: /close details/i })).toHaveClass(
      "min-h-11",
      "min-w-11",
    );
    expect(screen.getByRole("button", { name: "FLAE company" })).toHaveClass(
      "min-h-11",
    );
    expect(screen.getByLabelText("Entity details")).toHaveClass("md:max-h-none");
  });

  it("keeps the exact localized graph namespace in parity", () => {
    expect(en.GRAPH).toEqual({
      EYEBROW: "Workspace intelligence / entity topology",
      DESCRIPTION: "Trace extracted entities, relationships, and evidence across workspace knowledge.",
      VISIBLE_COUNTS: "{{nodes}} visible nodes / {{edges}} visible edges",
      TOOLS_ARIA: "Graph tools",
      BACK_TO_KNOWLEDGE: "Back to knowledge base",
      SEARCH_LABEL: "Search entities",
      SEARCH_PLACEHOLDER: "Search entities",
      VIEW_CONTROLS: "Graph view controls",
      ZOOM_IN: "Zoom in",
      ZOOM_OUT: "Zoom out",
      FIT_GRAPH: "Fit graph",
      ENTITY_TYPE: "Entity type",
      ALL_ENTITY_TYPES: "All entity types",
      PHYSICS_ON: "Physics on",
      PHYSICS_OFF: "Physics off",
      LOADING: "Loading knowledge graph",
      SELECT_WORKSPACE: "Select a workspace",
      SELECT_WORKSPACE_DESCRIPTION: "Select a workspace to explore its graph.",
      EMPTY_TITLE: "No graph data yet",
      EMPTY_DESCRIPTION: "Upload documents and wait for entity extraction to complete.",
      OPEN_KNOWLEDGE: "Open knowledge base",
      GESTURE_HINT: "Wheel to zoom / drag canvas to pan / drag nodes to reposition",
      ENTITY_DETAILS: "Entity details",
      RELATIONSHIP_DETAILS: "Relationship details",
      SOURCE: "Source",
      TARGET: "Target",
      CLOSE_DETAILS: "Close details",
      CONNECTED_ENTITIES: "Connected entities ({{count}})",
      NO_CONNECTIONS: "No visible connections.",
      FREQUENCY: "Frequency {{value}}",
      DEGREE: "Degree {{value}}",
      WEIGHT: "Weight {{value}}",
      LOAD_ERROR: "Unable to load the knowledge graph.",
    });
    expect(viTranslations.GRAPH).toEqual({
      EYEBROW: "Tri thức không gian làm việc / cấu trúc thực thể",
      DESCRIPTION: "Theo dõi các thực thể, mối quan hệ và bằng chứng được trích xuất từ tri thức của không gian làm việc.",
      VISIBLE_COUNTS: "{{nodes}} nút hiển thị / {{edges}} liên kết hiển thị",
      TOOLS_ARIA: "Công cụ đồ thị",
      BACK_TO_KNOWLEDGE: "Quay lại cơ sở tri thức",
      SEARCH_LABEL: "Tìm kiếm thực thể",
      SEARCH_PLACEHOLDER: "Tìm kiếm thực thể",
      VIEW_CONTROLS: "Điều khiển khung nhìn đồ thị",
      ZOOM_IN: "Phóng to",
      ZOOM_OUT: "Thu nhỏ",
      FIT_GRAPH: "Căn vừa đồ thị",
      ENTITY_TYPE: "Loại thực thể",
      ALL_ENTITY_TYPES: "Tất cả loại thực thể",
      PHYSICS_ON: "Mô phỏng đang bật",
      PHYSICS_OFF: "Mô phỏng đang tắt",
      LOADING: "Đang tải đồ thị tri thức",
      SELECT_WORKSPACE: "Chọn không gian làm việc",
      SELECT_WORKSPACE_DESCRIPTION: "Chọn một không gian làm việc để khám phá đồ thị.",
      EMPTY_TITLE: "Chưa có dữ liệu đồ thị",
      EMPTY_DESCRIPTION: "Tải lên tài liệu và chờ quá trình trích xuất thực thể hoàn tất.",
      OPEN_KNOWLEDGE: "Mở cơ sở tri thức",
      GESTURE_HINT: "Cuộn để thu phóng / kéo nền để di chuyển / kéo nút để đổi vị trí",
      ENTITY_DETAILS: "Chi tiết thực thể",
      RELATIONSHIP_DETAILS: "Chi tiết mối quan hệ",
      SOURCE: "Nguồn",
      TARGET: "Đích",
      CLOSE_DETAILS: "Đóng chi tiết",
      CONNECTED_ENTITIES: "Thực thể liên kết ({{count}})",
      NO_CONNECTIONS: "Không có liên kết hiển thị.",
      FREQUENCY: "Tần suất {{value}}",
      DEGREE: "Bậc liên kết {{value}}",
      WEIGHT: "Trọng số {{value}}",
      LOAD_ERROR: "Không thể tải đồ thị tri thức.",
    });
  });

  it("only references the search result list while suggestions are rendered", () => {
    const { rerender } = renderControl(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search=""
        suggestions={[]}
      />,
    );

    expect(screen.getByRole("searchbox", { name: /search entities/i })).not.toHaveAttribute(
      "aria-controls",
    );

    rerender(
      <GraphToolbar
        onCommand={vi.fn()}
        onFocusNode={vi.fn()}
        onSearchChange={vi.fn()}
        search="ada"
        suggestions={[node]}
      />,
    );

    expect(screen.getByRole("searchbox", { name: /search entities/i })).toHaveAttribute(
      "aria-controls",
      "graph-search-results",
    );
  });

  it("GRAPH-02C emits search, focus, zoom, and reset actions", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    const onSearchChange = vi.fn();
    const onCommand = vi.fn();
    renderControl(
      <GraphToolbar
        onCommand={onCommand}
        onFocusNode={onFocusNode}
        onSearchChange={onSearchChange}
        search="ad"
        suggestions={[node]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: /search entities/i }), "a");
    expect(onSearchChange).toHaveBeenLastCalledWith("ada");
    await user.click(screen.getByRole("option", { name: /ada person/i }));
    expect(onFocusNode).toHaveBeenCalledWith("node-1");
    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    await user.click(screen.getByRole("button", { name: /zoom out/i }));
    await user.click(screen.getByRole("button", { name: /fit graph/i }));
    expect(onCommand).toHaveBeenNthCalledWith(1, "zoom-in");
    expect(onCommand).toHaveBeenNthCalledWith(2, "zoom-out");
    expect(onCommand).toHaveBeenNthCalledWith(3, "reset");
  });

  it("GRAPH-03 emits typed filters and physics state", async () => {
    const user = userEvent.setup();
    const onNodeTypeChange = vi.fn();
    const onPhysicsChange = vi.fn();
    renderControl(
      <GraphFilters
        nodeType="all"
        nodeTypes={["company", "person"]}
        onNodeTypeChange={onNodeTypeChange}
        onPhysicsChange={onPhysicsChange}
        physicsEnabled
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: /entity type/i }), "person");
    expect(onNodeTypeChange).toHaveBeenCalledWith("person");
    await user.click(screen.getByRole("button", { name: /physics on/i }));
    expect(onPhysicsChange).toHaveBeenCalledWith(false);
  });

  it("GRAPH-02A renders node details and focuses neighboring nodes", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    renderControl(
      <GraphSelectionPanel
        neighbors={[neighbor]}
        onClose={vi.fn()}
        onFocusNode={onFocusNode}
        selectedEdge={null}
        selectedNode={node}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
    expect(screen.getByText(/frequency 4/i)).toBeInTheDocument();
    const neighborButton = screen.getByRole("button", { name: "FLAE company" });
    expect(neighborButton).toHaveAccessibleName("FLAE company");
    await user.click(neighborButton);
    expect(onFocusNode).toHaveBeenCalledWith("node-2");
  });

  it("uses the localized entity type label when a node type is missing", () => {
    renderControl(
      <GraphSelectionPanel
        neighbors={[]}
        onClose={vi.fn()}
        onFocusNode={vi.fn()}
        selectedEdge={null}
        selectedNode={{ ...node, type: "" }}
      />,
    );

    expect(screen.getByText("Entity type")).toBeInTheDocument();
  });

  it("GRAPH-02A renders edge details and navigates to either endpoint", async () => {
    const user = userEvent.setup();
    const onFocusNode = vi.fn();
    renderControl(
      <GraphSelectionPanel
        neighbors={[]}
        onClose={vi.fn()}
        onFocusNode={onFocusNode}
        selectedEdge={edge}
        selectedNode={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "FOUNDED" })).toBeInTheDocument();
    expect(screen.getByText("Current relationship")).toBeInTheDocument();
    const sourceButton = screen.getByRole("button", { name: "Source node-1" });
    const targetButton = screen.getByRole("button", { name: "Target node-2" });
    expect(sourceButton).toHaveAccessibleName("Source node-1");
    expect(targetButton).toHaveAccessibleName("Target node-2");
    await user.click(sourceButton);
    await user.click(targetButton);
    expect(onFocusNode.mock.calls).toEqual([["node-1"], ["node-2"]]);
  });

  it("localizes visible relationship direction labels in Vietnamese", () => {
    renderVietnameseControl(
      <GraphSelectionPanel
        neighbors={[]}
        onClose={vi.fn()}
        onFocusNode={vi.fn()}
        selectedEdge={edge}
        selectedNode={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Nguồn node-1" })).toHaveAccessibleName(
      "Nguồn node-1",
    );
    expect(screen.getByRole("button", { name: "Đích node-2" })).toHaveAccessibleName(
      "Đích node-2",
    );
  });
});
