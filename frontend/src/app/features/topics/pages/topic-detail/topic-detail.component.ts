import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { TopicsApiService } from '../../../../core/services/api/topics-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TopicDetailResponse, MemberDetail } from '../../../../core/models/topic.model';

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="h-full flex flex-col space-y-6">
      
      <!-- Header Action Bar -->
      <div class="flex items-center justify-between shrink-0">
        <button
          [routerLink]="['/dashboard/topics']"
          class="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-primary transition-colors cursor-pointer">
          <lucide-icon name="arrow-left" class="w-4 h-4"></lucide-icon>
          <span>{{ 'TOPICS.BACK_TO_LIST' | translate }}</span>
        </button>

        <div class="flex gap-2">
          <!-- Re-summarize Button -->
          <button
            (click)="onReSummarize()"
            [disabled]="processingAction()"
            class="flex items-center gap-2 px-3.5 py-2 border border-border hover:bg-subtle/50 text-text-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-all cursor-pointer">
            <lucide-icon name="refresh-cw" class="w-3.5 h-3.5" [class.animate-spin]="processingAction()"></lucide-icon>
            <span>{{ 'TOPICS.RE_SUMMARY_BTN' | translate }}</span>
          </button>
          
          <!-- Save Changes Button (if editing) -->
          @if (isEditing()) {
            <button
              (click)="onSaveChanges()"
              [disabled]="processingAction()"
              class="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer">
              <lucide-icon name="check" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ 'COMMON.SAVE' | translate }}</span>
            </button>
          } @else {
            <button
              (click)="isEditing.set(true)"
              class="flex items-center gap-2 px-3.5 py-2 border border-border hover:bg-subtle/50 text-text-primary rounded-lg text-xs font-semibold transition-all cursor-pointer">
              <lucide-icon name="pencil-line" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ 'TOPICS.EDIT' | translate }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Content (Split Layout) -->
      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <lucide-icon name="loader-circle" class="w-8 h-8 text-primary animate-spin"></lucide-icon>
        </div>
      } @else {
        @if (topic()) {
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
            
            <!-- Left Side: Topic Info & Summary (takes 2 cols) -->
            <div class="lg:col-span-2 flex flex-col space-y-6 overflow-y-auto pr-2 min-h-0">
              
              <!-- Topic Title & Status Details -->
              <div class="bg-surface border border-border rounded-2xl p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <!-- Type Badge -->
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-primary-soft text-primary border border-primary/20">
                    {{ topic()?.type }}
                  </span>

                  <!-- Status Select -->
                  @if (isEditing()) {
                    <select
                      [(ngModel)]="editStatus"
                      class="bg-surface border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer">
                      <option value="active">{{ 'TOPICS.STATUS_ACTIVE' | translate }}</option>
                      <option value="needs_review">{{ 'TOPICS.STATUS_NEEDS_REVIEW' | translate }}</option>
                      <option value="archived">{{ 'TOPICS.STATUS_ARCHIVED' | translate }}</option>
                    </select>
                  } @else {
                    <span
                      [class.bg-emerald-500/10]="topic()?.status === 'active'"
                      [class.text-emerald-600]="topic()?.status === 'active'"
                      [class.border-emerald-500/20]="topic()?.status === 'active'"
                      [class.bg-amber-500/10]="topic()?.status === 'needs_review'"
                      [class.text-amber-600]="topic()?.status === 'needs_review'"
                      [class.border-amber-500/20]="topic()?.status === 'needs_review'"
                      [class.bg-text-muted/10]="topic()?.status === 'archived'"
                      [class.text-text-muted]="topic()?.status === 'archived'"
                      class="px-2 py-0.5 rounded text-[11px] font-semibold border">
                      @if (topic()?.status === 'active') { {{ 'TOPICS.STATUS_ACTIVE' | translate }} }
                      @else if (topic()?.status === 'needs_review') { {{ 'TOPICS.STATUS_NEEDS_REVIEW' | translate }} }
                      @else { {{ 'TOPICS.STATUS_ARCHIVED' | translate }} }
                    </span>
                  }
                </div>

                <!-- Topic Name Input/Text -->
                @if (isEditing()) {
                  <input
                    type="text"
                    [(ngModel)]="editName"
                    class="w-full bg-subtle/30 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-lg font-bold outline-none transition-all" />
                } @else {
                  <h2 class="text-xl font-bold text-text-primary">{{ topic()?.name }}</h2>
                }

                <div class="flex items-center gap-6 text-xs text-text-secondary pt-2">
                  <span class="flex items-center gap-1.5">
                    <lucide-icon name="sparkles" class="w-4 h-4 text-primary"></lucide-icon>
                    <span>{{ 'TOPICS.CONFIDENCE_SCORE' | translate }}: <strong>{{ ((topic()?.confidence || 0) * 100) | number:'1.0-0' }}%</strong></span>
                  </span>
                  
                  <span class="flex items-center gap-1.5">
                    <lucide-icon name="database" class="w-4 h-4 text-text-muted"></lucide-icon>
                    <span>{{ 'TOPICS.KNOWLEDGE_LINKS' | translate }}: <strong>{{ topic()?.members?.length || 0 }}</strong></span>
                  </span>
                </div>
              </div>

              <!-- Current State Box -->
              @if (topic()?.current_state) {
                <div class="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 space-y-2">
                  <h4 class="text-xs font-bold text-amber-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <lucide-icon name="info" class="w-4 h-4"></lucide-icon>
                    <span>{{ 'TOPICS.CURRENT_STATE' | translate }}</span>
                  </h4>
                  <p class="text-xs text-text-secondary leading-relaxed">
                    {{ topic()?.current_state }}
                  </p>
                </div>
              }

              <!-- Summary Markdown Rendering -->
              <div class="bg-surface border border-border rounded-2xl p-6 space-y-4">
                <h3 class="text-sm font-bold text-text-primary border-b border-border pb-3 flex items-center gap-2">
                  <lucide-icon name="file-text" class="w-4 h-4 text-primary"></lucide-icon>
                  <span>{{ 'TOPICS.SUMMARY' | translate }}</span>
                </h3>
                
                @if (topic()?.summary) {
                  <!-- Fallback pre-wrap for Markdown summary representation -->
                  <div class="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary font-sans">
                    {{ topic()?.summary }}
                  </div>
                } @else {
                  <div class="py-10 text-center text-xs text-text-muted">
                    {{ 'TOPICS.NO_SUMMARY' | translate }}
                  </div>
                }
              </div>

            </div>

            <!-- Right Side: Links & Evidences Tabs (takes 1 col) -->
            <div class="bg-surface border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">
              <!-- Tabs Header -->
              <div class="flex border-b border-border bg-subtle/20 shrink-0 select-none">
                @for (tab of tabs; track tab.id) {
                  <button
                    (click)="activeTab.set(tab.id)"
                    [class.border-primary]="activeTab() === tab.id"
                    [class.text-primary]="activeTab() === tab.id"
                    [class.font-bold]="activeTab() === tab.id"
                    [class.border-transparent]="activeTab() !== tab.id"
                    [class.text-text-secondary]="activeTab() !== tab.id"
                    class="flex-1 py-3 text-center border-b-2 text-xs transition-all hover:text-primary cursor-pointer">
                    {{ tab.label | translate }}
                  </button>
                }
              </div>

              <!-- Tabs Content -->
              <div class="flex-1 overflow-y-auto p-4 min-h-0">
                <!-- Chunks Tab -->
                @if (activeTab() === 'chunks') {
                  <div class="space-y-3">
                    @for (m of getMembersByType('chunk'); track m.member_id) {
                      <div class="border border-border/80 rounded-xl p-3 bg-subtle/10 space-y-2">
                        <div class="flex items-center justify-between text-[10px] text-text-muted border-b border-border/40 pb-1.5">
                          <span class="font-mono">Chunk ID: {{ m.member_id.substring(0, 8) }}...</span>
                          <span>Độ liên quan: {{ (m.relevance_score * 100) | number:'1.0-0' }}%</span>
                        </div>
                        <p class="text-xs text-text-secondary italic leading-relaxed">
                          "{{ m.metadata['text'] || 'Không có nội dung' }}"
                        </p>
                      </div>
                    } @empty {
                      <div class="py-12 text-center text-xs text-text-muted">{{ 'TOPICS.NO_CHUNKS' | translate }}</div>
                    }
                  </div>
                }

                <!-- Documents Tab -->
                @if (activeTab() === 'documents') {
                  <div class="space-y-3">
                    @for (m of getMembersByType('document'); track m.member_id) {
                      <div
                        [routerLink]="['/dashboard/knowledge']"
                        class="flex items-start gap-3 border border-border/80 hover:border-primary/40 rounded-xl p-3 hover:bg-subtle/10 transition-all cursor-pointer">
                        <lucide-icon name="file-text" class="w-4 h-4 text-primary shrink-0 mt-0.5"></lucide-icon>
                        <div class="space-y-1">
                          <h5 class="text-xs font-bold text-text-primary line-clamp-2 leading-tight">
                            {{ m.metadata['title'] || 'Tài liệu không tên' }}
                          </h5>
                          <span class="text-[10px] bg-subtle text-text-muted px-1.5 py-0.5 rounded font-mono uppercase inline-block">
                            {{ m.metadata['document_type'] || 'document' }}
                          </span>
                        </div>
                      </div>
                    } @empty {
                      <div class="py-12 text-center text-xs text-text-muted">{{ 'TOPICS.NO_DOCS' | translate }}</div>
                    }
                  </div>
                }

                <!-- Entities Tab -->
                @if (activeTab() === 'entities') {
                  <div class="space-y-3">
                    @for (m of getMembersByType('entity'); track m.member_id) {
                      <div class="border border-border/80 rounded-xl p-3 bg-subtle/10 space-y-1.5">
                        <div class="flex items-center justify-between">
                          <h5 class="text-xs font-bold text-text-primary">{{ m.metadata['name'] || 'Thực thể' }}</h5>
                          <span class="text-[9px] bg-primary-soft text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase">
                            {{ m.metadata['type'] || 'other' }}
                          </span>
                        </div>
                        <p class="text-[11px] text-text-secondary leading-normal">
                          {{ m.metadata['description'] || 'Không có mô tả' }}
                        </p>
                      </div>
                    } @empty {
                      <div class="py-12 text-center text-xs text-text-muted">{{ 'TOPICS.NO_ENTITIES' | translate }}</div>
                    }
                  </div>
                }
              </div>

            </div>

          </div>
        }
      }

    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
        height: 100vh;
        overflow: hidden;
      }
    `
  ]
})
export class TopicDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceStore = inject(WorkspaceStore);
  private topicsApiService = inject(TopicsApiService);
  private toastService = inject(ToastService);

  // States
  topic = signal<TopicDetailResponse | null>(null);
  loading = signal<boolean>(false);
  processingAction = signal<boolean>(false);
  
  // Edit forms state
  isEditing = signal<boolean>(false);
  editName: string = '';
  editStatus: 'active' | 'archived' | 'needs_review' = 'active';

  // Tabs
  activeTab = signal<string>('chunks');
  readonly tabs = [
    { id: 'chunks', label: 'TOPICS.TAB_CHUNKS' },
    { id: 'documents', label: 'TOPICS.TAB_DOCUMENTS' },
    { id: 'entities', label: 'TOPICS.TAB_ENTITIES' }
  ];

  constructor() {
    combineLatest([
      this.route.paramMap,
      toObservable(this.workspaceStore.currentWorkspaceId)
    ]).pipe(
      takeUntilDestroyed()
    ).subscribe(([params, workspaceId]) => {
      const id = params.get('id');
      if (id && workspaceId) {
        this.fetchTopicDetail(workspaceId, id);
      }
    });
  }

  ngOnInit(): void {}

  fetchTopicDetail(workspaceId: string, id: string) {
    this.loading.set(true);
    this.topicsApiService.getTopic(workspaceId, id).subscribe({
      next: (data) => {
        this.topic.set(data);
        this.editName = data.name;
        this.editStatus = data.status;
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi fetch chi tiết topic:', err);
        this.toastService.error('TOPICS.FETCH_DETAIL_ERROR');
        this.loading.set(false);
        this.router.navigate(['/dashboard/topics']);
      }
    });
  }

  getMembersByType(type: string): MemberDetail[] {
    const list = this.topic()?.members || [];
    return list.filter(m => m.member_type === type);
  }

  onSaveChanges() {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    const currentTopic = this.topic();
    if (!workspaceId || !currentTopic) return;

    if (!this.editName.trim()) {
      this.toastService.error('TOPICS.NAME_REQUIRED');
      return;
    }

    this.processingAction.set(true);
    this.topicsApiService.updateTopic(workspaceId, currentTopic.topic_id, {
      name: this.editName,
      status: this.editStatus
    }).subscribe({
      next: () => {
        this.toastService.success('TOPICS.UPDATE_SUCCESS');
        this.isEditing.set(false);
        this.processingAction.set(false);
        // Reload details
        this.fetchTopicDetail(workspaceId, currentTopic.topic_id);
      },
      error: (err) => {
        console.error('Lỗi khi cập nhật topic:', err);
        this.toastService.error('TOPICS.SAVE_ERROR');
        this.processingAction.set(false);
      }
    });
  }

  onReSummarize() {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    const currentTopic = this.topic();
    if (!workspaceId || !currentTopic) return;

    this.processingAction.set(true);
    this.topicsApiService.reSummarizeTopic(workspaceId, currentTopic.topic_id).subscribe({
      next: () => {
        this.toastService.success('TOPICS.RE_SUMMARY_SUCCESS');
        this.processingAction.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tóm tắt lại topic:', err);
        this.toastService.error('TOPICS.RE_SUMMARY_ERROR');
        this.processingAction.set(false);
      }
    });
  }
}
