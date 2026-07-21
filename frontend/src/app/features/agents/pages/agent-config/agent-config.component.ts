import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AgentService } from '../../services/agent.service';
import { Agent } from '../../models/agent.model';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthStore } from '../../../../core/stores/auth.store';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { WorkspaceApiService } from '../../../../core/services/api/workspace-api.service';

@Component({
  selector: 'app-agent-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-3xl mx-auto min-h-screen bg-app text-text-secondary">
      <!-- Breadcrumbs -->
      <div class="flex items-center gap-2 text-xs text-text-muted mb-6">
        <button (click)="goBack()" class="hover:text-text-primary transition-colors">AI Agents</button>
        <lucide-icon name="chevron-right" class="w-3 h-3"></lucide-icon>
        <span class="text-text-primary font-semibold">{{ isEditMode() ? 'Chỉnh sửa Agent' : 'Tạo mới Agent' }}</span>
      </div>

      <div class="bg-surface rounded-2xl border border-border p-8 shadow-soft">
        <div class="mb-8">
          <h2 class="text-xl font-bold text-text-primary">{{ isEditMode() ? 'Cập nhật cấu hình Agent' : 'Tạo mới AI Agent' }}</h2>
          <p class="text-text-muted text-sm mt-1">Thiết lập cấu hình hành vi, mô hình AI và các tham số cho trợ lý của bạn.</p>
        </div>

        <form [formGroup]="agentForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
          
          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-text-muted uppercase tracking-wider">Tên Agent</label>
            <input 
              type="text" 
              formControlName="name"
              placeholder="Ví dụ: Trợ lý tuyển dụng, IT Helpdesk..."
              class="w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30"
            />
            @if (agentForm.get('name')?.invalid && agentForm.get('name')?.touched) {
              <span class="text-xs text-error">Vui lòng nhập tên của Agent.</span>
            }
          </div>

          <!-- Avatar Pickers -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Colors -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-text-muted uppercase tracking-wider">Màu sắc chủ đạo</label>
              <div class="flex flex-wrap gap-2.5">
                @for (c of COLORS; track c.class) {
                  <button 
                    type="button"
                    (click)="selectColor(c.class)"
                    [class]="'w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all ' + c.class + 
                      (selectedColor() === c.class ? ' ring-4 ring-primary/20 border-2 border-app scale-110' : '')"
                  >
                    @if (selectedColor() === c.class) {
                      <lucide-icon name="check" class="w-4 h-4"></lucide-icon>
                    }
                  </button>
                }
              </div>
            </div>

            <!-- Icons -->
            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold text-text-muted uppercase tracking-wider">Icon đại diện</label>
              <div class="flex flex-wrap gap-2.5">
                @for (icon of ICONS; track icon) {
                  <button 
                    type="button"
                    (click)="selectIcon(icon)"
                    [class]="'w-8 h-8 rounded-lg border flex items-center justify-center transition-all ' + 
                      (selectedIcon() === icon 
                        ? 'bg-primary border-primary text-app scale-110 shadow-primary' 
                        : 'bg-app border-border text-text-secondary hover:bg-white/5 hover:text-text-primary')"
                  >
                    <lucide-icon [name]="icon" class="w-4.5 h-4.5"></lucide-icon>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- System Prompt -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-text-muted uppercase tracking-wider">System Prompt (Chỉ dẫn hành vi)</label>
            <textarea 
              formControlName="system_prompt"
              rows="6"
              placeholder="Ví dụ: Bạn là một trợ lý nhân sự thông minh. Bạn có nhiệm vụ giải đáp thắc mắc của ứng viên về chính sách đãi ngộ dựa trên tài liệu được cung cấp..."
              class="min-h-28 w-full rounded-xl border border-border bg-app px-3 py-2 text-sm leading-6 text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30 resize-none"
            ></textarea>
            @if (agentForm.get('system_prompt')?.invalid && agentForm.get('system_prompt')?.touched) {
              <span class="text-xs text-error">Vui lòng nhập System Prompt để định hướng hành vi của Agent.</span>
            }
          </div>

          <!-- LLM Parameters -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-subtle p-5 rounded-2xl border border-border">
            <!-- Model Select -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-text-muted uppercase tracking-wider">Mô hình AI (LLM Model)</label>
              <select 
                formControlName="model_name"
                class="w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-text-primary outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nhanh & Tối ưu)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Thông minh & Logic sâu)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Tiêu chuẩn)</option>
              </select>
            </div>

            <!-- Temperature -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-text-muted uppercase tracking-wider">Độ sáng tạo (Temperature)</label>
                <span class="text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-md">
                  {{ agentForm.get('temperature')?.value }}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1.5" 
                step="0.1"
                formControlName="temperature"
                class="w-full mt-2 accent-primary"
              />
              <div class="flex justify-between text-[10px] text-text-disabled mt-1">
                <span>Chính xác / Thực tế (0.0)</span>
                <span>Sáng tạo / Tự do (1.5)</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
            <button 
              type="button" 
              (click)="goBack()"
              class="inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-strong hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-ai/30"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              [disabled]="agentForm.invalid || loading()"
              class="inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-app shadow-primary transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:pointer-events-none gap-2"
            >
              @if (loading()) {
                <lucide-icon name="refresh-cw" class="w-4 h-4 animate-spin"></lucide-icon>
              }
              {{ isEditMode() ? 'Lưu thay đổi' : 'Tạo Agent' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  `
})
export class AgentConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private agentService = inject(AgentService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authStore = inject(AuthStore);
  private workspaceStore = inject(WorkspaceStore);
  private workspaceApiService = inject(WorkspaceApiService);

  agentForm!: FormGroup;
  isEditMode = signal<boolean>(false);
  agentId = signal<string | null>(null);
  loading = signal<boolean>(false);
  
  selectedColor = signal<string>('bg-indigo-500');
  selectedIcon = signal<string>('bot');

  COLORS = [
    { class: 'bg-indigo-500', name: 'Indigo' },
    { class: 'bg-emerald-500', name: 'Emerald' },
    { class: 'bg-rose-500', name: 'Rose' },
    { class: 'bg-amber-500', name: 'Amber' },
    { class: 'bg-sky-500', name: 'Sky' },
    { class: 'bg-purple-500', name: 'Purple' }
  ];

  ICONS = ['bot', 'brain', 'sparkles', 'database', 'terminal', 'briefcase'];

  ngOnInit() {
    this.checkPermissions();
    this.initForm();
    
    // Kiểm tra mode Edit
    const id = this.route.snapshot.paramMap.get('agentId');
    if (id) {
      this.isEditMode.set(true);
      this.agentId.set(id);
      this.loadAgent(id);
    }
  }

  initForm() {
    this.agentForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      avatar_color: [this.selectedColor(), Validators.required],
      avatar_icon: [this.selectedIcon(), Validators.required],
      system_prompt: ['', Validators.required],
      model_name: ['gemini-2.5-flash', Validators.required],
      temperature: [0.2, [Validators.required, Validators.min(0), Validators.max(2)]]
    });
  }

  selectColor(colorClass: string) {
    this.selectedColor.set(colorClass);
    this.agentForm.patchValue({ avatar_color: colorClass });
  }

  selectIcon(iconName: string) {
    this.selectedIcon.set(iconName);
    this.agentForm.patchValue({ avatar_icon: iconName });
  }

  loadAgent(id: string) {
    this.loading.set(true);
    this.agentService.getAgent(id).subscribe({
      next: (agent) => {
        this.agentForm.patchValue({
          name: agent.name,
          avatar_color: agent.avatar_color,
          avatar_icon: agent.avatar_icon,
          system_prompt: agent.system_prompt,
          model_name: agent.model_name || 'gemini-2.5-flash',
          temperature: agent.temperature ?? 0.2
        });
        this.selectedColor.set(agent.avatar_color);
        this.selectedIcon.set(agent.avatar_icon);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Không thể tải thông tin Agent');
        this.router.navigate(['/dashboard/agents']);
      }
    });
  }

  onSubmit() {
    if (this.agentForm.invalid) return;
    
    this.loading.set(true);
    const payload: Agent = this.agentForm.value;

    const request$ = this.isEditMode()
      ? this.agentService.updateAgent(this.agentId()!, payload)
      : this.agentService.createAgent(payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(this.isEditMode() ? 'Đã lưu cấu hình thành công' : 'Đã tạo Agent mới thành công');
        this.router.navigate(['/dashboard/agents']);
      },
      error: () => {
        this.toastService.error(this.isEditMode() ? 'Lỗi khi lưu cấu hình Agent' : 'Lỗi khi tạo Agent mới');
        this.loading.set(false);
      }
    });
  }

  checkPermissions() {
    const wsId = this.workspaceStore.currentWorkspaceId();
    const userUid = this.authStore.currentUser()?.firebase_uid;
    if (!wsId || !userUid) {
      this.router.navigate(['/dashboard/agents']);
      return;
    }
    
    this.workspaceApiService.getWorkspaceMembers(wsId).subscribe({
      next: (members) => {
        const match = members.find(m => m.user_uid === userUid);
        const role = match ? match.role : 'member';
        if (role !== 'owner' && role !== 'admin') {
          this.toastService.error('Bạn không có quyền thực hiện hành động này');
          this.router.navigate(['/dashboard/agents']);
        }
      },
      error: () => {
        this.toastService.error('Không thể xác thực quyền truy cập');
        this.router.navigate(['/dashboard/agents']);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/agents']);
  }
}
