import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { KnowledgeBaseApiService } from '../../../../core/services/api/knowledge-base-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  GraphNode,
  GraphEdge,
  KnowledgeGraphData,
} from '../../../../core/models/knowledge-base.model';

interface ExtendedNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
  color: string;
}

interface ExtendedEdge extends GraphEdge {
  particleProgress?: number[]; // Lưu tiến trình chuyển động của hạt sáng trên cạnh
}

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, TranslateModule],
  templateUrl: './knowledge-graph.component.html',
  styles: [
    `
      :host {
        display: block;
        height: calc(100vh - 4.5rem);
        width: 100%;
        overflow: hidden;
      }
      .custom-sidebar {
        backdrop-filter: blur(16px);
      }
    `,
  ],
})
export class KnowledgeGraphComponent implements OnInit, OnDestroy {
  @ViewChild('graphCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private workspaceStore = inject(WorkspaceStore);
  private apiService = inject(KnowledgeBaseApiService);
  private toastService = inject(ToastService);

  // States
  graphData = signal<KnowledgeGraphData>({ nodes: [], edges: [] });
  loading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedNodeType = signal<string>('all');
  selectedNode = signal<ExtendedNode | null>(null);
  selectedEdge = signal<ExtendedEdge | null>(null);
  enablePhysics = signal<boolean>(true);

  // Canvas context và view transformation state
  private ctx!: CanvasRenderingContext2D;
  private transform = { x: 0, y: 0, k: 1 };
  private nodes: ExtendedNode[] = [];
  private edges: ExtendedEdge[] = [];
  private animationFrameId: number | null = null;

  // Cấu hình vật lý Force-directed
  private repulsionStrength = 1500;
  private attractionStrength = 0.04;
  private linkDistance = 120;
  private gravity = 0.02;
  private damping = 0.85;

  // Mouse interaction state
  private isDraggingView = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private transformStartX = 0;
  private transformStartY = 0;
  private draggedNode: ExtendedNode | null = null;

  // Lấy danh sách duy nhất các loại node để hiển thị bộ lọc
  nodeTypes = computed(() => {
    const types = new Set<string>();
    this.graphData().nodes.forEach((n) => {
      if (n.type) types.add(n.type);
    });
    return Array.from(types);
  });

  // Tìm kiếm node gợi ý
  suggestedNodes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    return this.nodes
      .filter((n) => n.name.toLowerCase().includes(query))
      .slice(0, 5);
  });

  // Tìm các node liên quan trực tiếp đến node đang chọn
  neighborNodes = computed(() => {
    const node = this.selectedNode();
    if (!node) return [];
    const neighbors = new Set<ExtendedNode>();
    this.edges.forEach((edge) => {
      if (edge.source === node.id) {
        const found = this.nodes.find((n) => n.id === edge.target);
        if (found) neighbors.add(found);
      } else if (edge.target === node.id) {
        const found = this.nodes.find((n) => n.id === edge.source);
        if (found) neighbors.add(found);
      }
    });
    return Array.from(neighbors);
  });

  constructor() {
    // Tự động load lại graph khi đổi workspace
    effect(() => {
      const workspaceId = this.workspaceStore.currentWorkspaceId();
      if (workspaceId) {
        this.fetchGraph(workspaceId);
      } else {
        this.clearGraph();
      }
    });
  }

  ngOnInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.setupResizeListener();
  }

  ngOnDestroy() {
    this.stopAnimation();
    window.removeEventListener('resize', this.resizeCanvas);
  }

  fetchGraph(workspaceId: string) {
    this.loading.set(true);
    this.apiService.getKnowledgeGraph(workspaceId).subscribe({
      next: (data) => {
        this.graphData.set(data);
        this.initializeGraphData(data);
        this.loading.set(false);
        this.toastService.success('Đã tải đồ thị tri thức.');
      },
      error: (err) => {
        console.error('Lỗi khi tải đồ thị tri thức:', err);
        this.clearGraph();
        this.loading.set(false);
        this.toastService.error('Không thể lấy đồ thị tri thức.');
      },
    });
  }

  private clearGraph() {
    this.graphData.set({ nodes: [], edges: [] });
    this.nodes = [];
    this.edges = [];
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.draw();
  }

  private initializeGraphData(data: KnowledgeGraphData) {
    const width = this.canvasRef.nativeElement.width || 800;
    const height = this.canvasRef.nativeElement.height || 600;

    // Map các node cũ để giữ nguyên vị trí (tối ưu hóa khi re-render)
    const existingNodeMap = new Map<string, ExtendedNode>();
    this.nodes.forEach((n) => existingNodeMap.set(n.id, n));

    // Khởi tạo các node
    this.nodes = data.nodes.map((node) => {
      const existing = existingNodeMap.get(node.id);
      const radius = Math.min(18 + (node.frequency || 1) * 2, 35);
      return {
        ...node,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 150,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 150,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        fx: existing ? existing.fx : null,
        fy: existing ? existing.fy : null,
        radius,
        color: this.getNodeColor(node.type),
      };
    });

    // Khởi tạo các edges và hạt sáng chuyển động (particles)
    this.edges = data.edges.map((edge) => {
      // Gán 1-3 hạt sáng ngẫu nhiên di chuyển trên link
      const particleProgress: number[] = [];
      const particleCount = Math.min(1 + Math.floor(Math.random() * 2), 3);
      for (let i = 0; i < particleCount; i++) {
        particleProgress.push(Math.random());
      }
      return {
        ...edge,
        particleProgress,
      };
    });

    this.resetView();
    this.startAnimation();
  }

  private getNodeColor(type: string): string {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('person') || typeLower.includes('người')) return '#f97316'; // Orange
    if (typeLower.includes('org') || typeLower.includes('chức') || typeLower.includes('company'))
      return '#3b82f6'; // Blue
    if (typeLower.includes('loc') || typeLower.includes('điểm') || typeLower.includes('city'))
      return '#10b981'; // Green
    if (typeLower.includes('concept') || typeLower.includes('khái niệm') || typeLower.includes('tech'))
      return '#8b5cf6'; // Purple
    if (typeLower.includes('event') || typeLower.includes('sự kiện')) return '#ec4899'; // Pink
    return '#6b7280'; // Gray (mặc định)
  }

  private startAnimation() {
    this.stopAnimation();
    const tick = () => {
      if (this.enablePhysics()) {
        this.updatePhysics();
      }
      this.updateParticles();
      this.draw();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updatePhysics() {
    const width = this.canvasRef.nativeElement.width;
    const height = this.canvasRef.nativeElement.height;
    const nodeMap = new Map<string, ExtendedNode>(this.nodes.map((n) => [n.id, n]));

    // Lọc bỏ các node bị ẩn bởi filter
    const activeNodes = this.nodes.filter(
      (n) => this.selectedNodeType() === 'all' || n.type === this.selectedNodeType()
    );
    const activeNodeIds = new Set(activeNodes.map((n) => n.id));

    // 1. Lực đẩy Coulomb (repulsion) giữa các node
    for (let i = 0; i < activeNodes.length; i++) {
      const nodeA = activeNodes[i];
      for (let j = i + 1; j < activeNodes.length; j++) {
        const nodeB = activeNodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) dist = 1;

        // Tránh đẩy quá mạnh ở khoảng cách cực gần
        const force = this.repulsionStrength / Math.max(dist, 10);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (nodeA.fx === null) {
          nodeA.vx -= fx;
          nodeA.vy -= fy;
        }
        if (nodeB.fx === null) {
          nodeB.vx += fx;
          nodeB.vy += fy;
        }
      }
    }

    // 2. Lực hút lò xo Hooke (attraction) giữa các node có liên kết
    this.edges.forEach((edge) => {
      if (!activeNodeIds.has(edge.source) || !activeNodeIds.has(edge.target)) return;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const delta = dist - this.linkDistance;
        const force = delta * this.attractionStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (sourceNode.fx === null) {
          sourceNode.vx += fx;
          sourceNode.vy += fy;
        }
        if (targetNode.fx === null) {
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      }
    });

    // 3. Lực hướng tâm (Gravity) và cập nhật tọa độ
    const centerX = width / 2;
    const centerY = height / 2;
    this.nodes.forEach((node) => {
      if (node.fx !== null) {
        node.x = node.fx;
        node.y = node.fy!;
        node.vx = 0;
        node.vy = 0;
      } else {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * this.gravity;
        node.vy += dy * this.gravity;

        // Cập nhật toạ độ kèm damping
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= this.damping;
        node.vy *= this.damping;
      }
    });
  }

  private updateParticles() {
    // Hạt chuyển động chậm rãi dọc theo các cạnh
    this.edges.forEach((edge) => {
      if (edge.particleProgress) {
        edge.particleProgress = edge.particleProgress.map((p) => {
          let nextP = p + 0.008; // tốc độ di chuyển
          if (nextP > 1) nextP = 0; // lặp lại từ đầu
          return nextP;
        });
      }
    });
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.ctx.save();
    // Áp dụng phép chuyển đổi (Zoom & Pan)
    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.k, this.transform.k);

    const nodeMap = new Map<string, ExtendedNode>(this.nodes.map((n) => [n.id, n]));

    // Xác định bộ node active
    const activeNodes = this.nodes.filter(
      (n) => this.selectedNodeType() === 'all' || n.type === this.selectedNodeType()
    );
    const activeNodeIds = new Set(activeNodes.map((n) => n.id));

    // 1. Vẽ các cạnh (Edges)
    this.edges.forEach((edge) => {
      if (!activeNodeIds.has(edge.source) || !activeNodeIds.has(edge.target)) return;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        const isSelected = this.selectedEdge()?.id === edge.id;
        const isRelatedToSelectedNode =
          this.selectedNode() &&
          (this.selectedNode()?.id === edge.source || this.selectedNode()?.id === edge.target);

        this.ctx.beginPath();
        this.ctx.moveTo(sourceNode.x, sourceNode.y);
        this.ctx.lineTo(targetNode.x, targetNode.y);

        // Styling cho cạnh
        if (isSelected) {
          this.ctx.strokeStyle = '#6366f1'; // Indigo phát sáng
          this.ctx.lineWidth = 3;
        } else if (isRelatedToSelectedNode) {
          this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
          this.ctx.lineWidth = 2;
        } else {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          this.ctx.lineWidth = 1;
        }
        this.ctx.stroke();

        // Vẽ nhãn quan hệ nếu zoom đủ lớn (> 0.7) hoặc được select
        if (this.transform.k > 0.7 || isSelected) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;

          this.ctx.save();
          // Xoay text theo chiều của đường line
          const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
          this.ctx.translate(midX, midY);
          // Đảm bảo chữ không bị ngược đầu
          const textAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle;
          this.ctx.rotate(textAngle);

          this.ctx.font = '9px monospace';
          this.ctx.fillStyle = isSelected ? '#a5b4fc' : 'rgba(255, 255, 255, 0.4)';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'bottom';
          // Vẽ nền mờ sau text để dễ nhìn
          const textWidth = this.ctx.measureText(edge.label || '').width;
          this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          this.ctx.fillRect(-textWidth / 2 - 4, -12, textWidth + 8, 14);

          this.ctx.fillStyle = isSelected ? '#a5b4fc' : 'rgba(255, 255, 255, 0.4)';
          this.ctx.fillText(edge.label || 'RELATES_TO', 0, 0);
          this.ctx.restore();
        }

        // 2. Vẽ các hạt sáng di chuyển (Particles)
        if (edge.particleProgress) {
          edge.particleProgress.forEach((p) => {
            const px = sourceNode.x + (targetNode.x - sourceNode.x) * p;
            const py = sourceNode.y + (targetNode.y - sourceNode.y) * p;

            this.ctx.beginPath();
            this.ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
            this.ctx.fillStyle = isSelected || isRelatedToSelectedNode ? '#818cf8' : '#38bdf8'; // Indigo/Cyan
            this.ctx.shadowColor = '#38bdf8';
            this.ctx.shadowBlur = 4;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset shadow
          });
        }
      }
    });

    // 3. Vẽ các nút (Nodes)
    activeNodes.forEach((node) => {
      const isSelected = this.selectedNode()?.id === node.id;
      const isNeighborOfSelected =
        this.selectedNode() &&
        this.edges.some(
          (e) =>
            (e.source === node.id && e.target === this.selectedNode()?.id) ||
            (e.target === node.id && e.source === this.selectedNode()?.id)
        );

      // Gradient fill tạo chiều sâu 3D bóng bẩy cho node
      const grad = this.ctx.createRadialGradient(
        node.x - node.radius / 3,
        node.y - node.radius / 3,
        node.radius / 10,
        node.x,
        node.y,
        node.radius
      );
      grad.addColorStop(0, this.lightenColor(node.color, 40));
      grad.addColorStop(0.4, node.color);
      grad.addColorStop(1, this.darkenColor(node.color, 40));

      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = grad;

      // Glow effect cho selected node hoặc hover node
      if (isSelected) {
        this.ctx.shadowColor = node.color;
        this.ctx.shadowBlur = 18;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
      } else if (isNeighborOfSelected) {
        this.ctx.shadowColor = node.color;
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2.5;
      } else {
        this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        this.ctx.lineWidth = 1.5;
      }

      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // Reset shadow

      // Hiển thị nhãn Text dưới Node
      this.ctx.font = isSelected
        ? 'bold 11px sans-serif'
        : '10px sans-serif';
      this.ctx.fillStyle = isSelected
        ? '#ffffff'
        : isNeighborOfSelected
        ? 'rgba(255, 255, 255, 0.9)'
        : 'rgba(255, 255, 255, 0.65)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';

      // Cắt bớt tên dài nếu không được select
      let labelText = node.name;
      if (!isSelected && labelText.length > 15) {
        labelText = labelText.substring(0, 12) + '...';
      }

      this.ctx.fillText(labelText, node.x, node.y + node.radius + 5);

      // Vẽ badge loại thực thể nhỏ phía trên node khi zoom gần
      if (this.transform.k > 1.2 || isSelected) {
        this.ctx.font = '8px sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.fillText(`[${node.type}]`, node.x, node.y - node.radius - 12);
      }
    });

    this.ctx.restore();
  }

  // Helper chỉnh màu sắc cho gradient 3D bóng bẩy
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = ((num >> 8) & 0x00ff) + amt,
      B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = ((num >> 8) & 0x00ff) - amt,
      B = (num & 0x0000ff) - amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  // Tương tác chuột trên Canvas
  onCanvasMouseDown(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Chuyển đổi toạ độ click chuột thành toạ độ graph (tính cả scale/translation)
    const graphX = (mouseX - this.transform.x) / this.transform.k;
    const graphY = (mouseY - this.transform.y) / this.transform.k;

    // 1. Tìm xem click có trúng node nào không
    let clickedNode: ExtendedNode | null = null;
    const activeNodes = this.nodes.filter(
      (n) => this.selectedNodeType() === 'all' || n.type === this.selectedNodeType()
    );

    // Quét từ cuối (node vẽ đè lên trên)
    for (let i = activeNodes.length - 1; i >= 0; i--) {
      const node = activeNodes[i];
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.radius) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      this.draggedNode = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;

      this.selectedNode.set(clickedNode);
      this.selectedEdge.set(null);
      return;
    }

    // 2. Tìm xem click có trúng link/edge nào không
    let clickedEdge: ExtendedEdge | null = null;
    const nodeMap = new Map<string, ExtendedNode>(this.nodes.map((n) => [n.id, n]));

    for (const edge of this.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (src && tgt) {
        // Tính khoảng cách từ điểm click chuột tới đoạn thẳng src-tgt
        const dist = this.distToSegment(graphX, graphY, src.x, src.y, tgt.x, tgt.y);
        if (dist < 6) {
          clickedEdge = edge;
          break;
        }
      }
    }

    if (clickedEdge) {
      this.selectedEdge.set(clickedEdge);
      this.selectedNode.set(null);
      return;
    }

    // 3. Nếu không trúng gì cả -> Bắt đầu PAN view
    this.isDraggingView = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.transformStartX = this.transform.x;
    this.transformStartY = this.transform.y;

    // Deselect
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
  }

  onCanvasMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (this.draggedNode) {
      // Di chuyển node đang kéo thả theo chuột
      const graphX = (mouseX - this.transform.x) / this.transform.k;
      const graphY = (mouseY - this.transform.y) / this.transform.k;
      this.draggedNode.fx = graphX;
      this.draggedNode.fy = graphY;
      // Kích hoạt lại physics nếu tắt
      if (!this.enablePhysics()) {
        this.draggedNode.x = graphX;
        this.draggedNode.y = graphY;
      }
    } else if (this.isDraggingView) {
      // Dịch chuyển camera pan
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      this.transform.x = this.transformStartX + dx;
      this.transform.y = this.transformStartY + dy;
    }
  }

  onCanvasMouseUp() {
    if (this.draggedNode) {
      this.draggedNode.fx = null;
      this.draggedNode.fy = null;
      this.draggedNode = null;
    }
    this.isDraggingView = false;
  }

  onCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Tọa độ graph trước khi zoom
    const graphX = (mouseX - this.transform.x) / this.transform.k;
    const graphY = (mouseY - this.transform.y) / this.transform.k;

    // Tính toán tỷ lệ zoom mới
    const zoomFactor = 1.1;
    let newK = this.transform.k;
    if (event.deltaY < 0) {
      newK *= zoomFactor;
    } else {
      newK /= zoomFactor;
    }
    // Giới hạn zoom từ 0.15x đến 5x
    newK = Math.max(0.15, Math.min(newK, 5));

    // Cập nhật transform pan để tâm zoom nằm tại con trỏ chuột
    this.transform.k = newK;
    this.transform.x = mouseX - graphX * newK;
    this.transform.y = mouseY - graphY * newK;
  }

  // Tìm node từ ô tìm kiếm, zoom-in và focus vào nó
  focusOnNode(node: ExtendedNode) {
    this.selectedNode.set(node);
    this.selectedEdge.set(null);
    this.searchQuery.set('');

    const canvas = this.canvasRef.nativeElement;
    const targetK = 1.5; // Zoom sâu
    this.transform.k = targetK;
    this.transform.x = canvas.width / 2 - node.x * targetK;
    this.transform.y = canvas.height / 2 - node.y * targetK;
  }

  resetView() {
    const canvas = this.canvasRef.nativeElement;
    if (this.nodes.length === 0) {
      this.transform = { x: 0, y: 0, k: 1 };
      return;
    }

    // Tìm vùng bao của tất cả nodes
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    this.nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphW = maxX - minX || 100;
    const graphH = maxY - minY || 100;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const pad = 80;
    const scaleX = (canvas.width - pad) / graphW;
    const scaleY = (canvas.height - pad) / graphH;
    const k = Math.max(0.2, Math.min(scaleX, scaleY, 1.2)); // giới hạn tỷ lệ zoom vừa khung hình

    this.transform.k = k;
    this.transform.x = canvas.width / 2 - graphCenterX * k;
    this.transform.y = canvas.height / 2 - graphCenterY * k;
  }

  // helper tính khoảng cách từ điểm tới đoạn thẳng
  private distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Quản lý resize canvas
  private resizeCanvas = () => {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
  };

  private setupResizeListener() {
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
  }
}
