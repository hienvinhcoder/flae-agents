import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AgentService } from '../../services/agent.service';
import { Agent } from '../../models/agent.model';
import { AgentCardComponent } from '../../ui/agent-card/agent-card.component';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { WorkspaceApiService } from '../../../../core/services/api/workspace-api.service';
import { WorkspaceRole } from '../../../../core/models/workspace.model';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AgentCardComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto min-h-screen bg-app text-text-secondary">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">AI Agents</h1>
          <p class="text-text-muted text-sm mt-1">Quản lý và cộng tác với các trợ lý AI chuyên biệt được tối ưu hóa cho công việc của bạn.</p>
        </div>
        
        @if (isAdminOrOwner()) {
          <button 
            (click)="navigateToConfig()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary text-app hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold text-sm transition-colors shadow-primary"
          >
            <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
            Tạo mới Agent
          </button>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center min-h-[300px]">
          <div class="flex flex-col items-center gap-3">
            <lucide-icon name="refresh-cw" class="w-8 h-8 text-primary animate-spin"></lucide-icon>
            <span class="text-sm font-medium text-text-muted">Đang tải danh sách Agent...</span>
          </div>
        </div>
      } @else {
        <!-- Empty State -->
        @if (agents().length === 0) {
          <div class="bg-surface rounded-2xl border border-border p-12 text-center max-w-xl mx-auto shadow-soft mt-12">
            <div class="w-16 h-16 bg-subtle border border-border rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted">
              <lucide-icon name="bot" class="w-8 h-8"></lucide-icon>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-2">Chưa có Agent nào</h3>
            <p class="text-text-muted text-sm mb-6 max-w-sm mx-auto">
              Hãy tạo Agent đầu tiên và cấu hình System Prompt để Agent trả lời dựa trên tài liệu lưu trữ của bạn.
            </p>
            @if (isAdminOrOwner()) {
              <button 
                (click)="navigateToConfig()"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary text-app hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold transition-colors shadow-primary"
              >
                <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                Tạo mới Agent
              </button>
            }
          </div>
        } @else {
          <!-- Grid List -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (agent of agents(); track agent.id) {
              <app-agent-card
                [agent]="agent"
                [canManage]="isAdminOrOwner()"
                (edit)="onEditAgent($event)"
                (delete)="onDeleteAgent($event)"
                (chat)="onStartChat($event)"
              ></app-agent-card>
            }
          </div>
        }
      }
    </div>
  `
})
export class AgentListComponent implements OnInit {
  private agentService = inject(AgentService);
  private workspaceStore = inject(WorkspaceStore);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private workspaceApiService = inject(WorkspaceApiService);

  agents = signal<Agent[]>([]);
  loading = signal<boolean>(true);
  currentUserRole = signal<WorkspaceRole>('member');
  isAdminOrOwner = computed(() => this.currentUserRole() === 'owner' || this.currentUserRole() === 'admin');

  constructor() {
    // Tự động tải lại danh sách khi thay đổi workspace
    effect(() => {
      if (this.workspaceStore.currentWorkspaceId()) {
        this.fetchAgents();
      }
    });
  }

  ngOnInit() {
    this.fetchAgents();
  }

  fetchAgents() {
    const wsId = this.workspaceStore.currentWorkspaceId();
    if (!wsId) return;
    this.loading.set(true);
    this.agentService.getAgents().subscribe({
      next: (data) => {
        this.agents.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toastService.error('Không thể tải danh sách AI Agents');
        this.loading.set(false);
      }
    });

    const userUid = this.authStore.currentUser()?.firebase_uid;
    if (userUid) {
      this.workspaceApiService.getWorkspaceMembers(wsId).subscribe({
        next: (members) => {
          const match = members.find(m => m.user_uid === userUid);
          this.currentUserRole.set(match ? match.role : 'member');
        },
        error: () => {
          this.currentUserRole.set('member');
        }
      });
    }
  }

  navigateToConfig() {
    this.router.navigate(['/dashboard/agents/new']);
  }

  onEditAgent(agent: Agent) {
    this.router.navigate([`/dashboard/agents/${agent.id}/edit`]);
  }

  onDeleteAgent(agent: Agent) {
    if (confirm(`Bạn có chắc chắn muốn xóa Agent "${agent.name}"? Lịch sử chat liên quan cũng sẽ bị xóa.`)) {
      this.agentService.deleteAgent(agent.id!).subscribe({
        next: () => {
          this.toastService.success('Đã xóa Agent thành công');
          this.fetchAgents();
        },
        error: () => {
          this.toastService.error('Không thể xóa Agent');
        }
      });
    }
  }

  onStartChat(agent: Agent) {
    this.router.navigate([`/dashboard/agents/${agent.id}/chat`]);
  }
}
