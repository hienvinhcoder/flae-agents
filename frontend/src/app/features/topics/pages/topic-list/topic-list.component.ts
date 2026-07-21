import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { TopicsApiService } from '../../../../core/services/api/topics-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Topic } from '../../../../core/models/topic.model';
import { TopicCardComponent } from '../../ui/topic-card/topic-card.component';
import { TopicMergeDialogComponent } from '../../ui/topic-merge-dialog/topic-merge-dialog.component';

@Component({
  selector: 'app-topic-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    TopicCardComponent,
    TopicMergeDialogComponent
  ],
  template: `
    <div class="h-full flex flex-col space-y-6">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 class="text-xl font-bold text-text-primary">{{ 'TOPICS.TITLE' | translate }}</h1>
          <p class="text-xs text-text-secondary mt-1">
            {{ 'TOPICS.DESC' | translate }}
          </p>
        </div>
        
        <button
          (click)="openMergeDialog()"
          [disabled]="topics().length < 2"
          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm w-fit">
          <lucide-icon name="git-merge" class="w-4 h-4"></lucide-icon>
          <span>{{ 'TOPICS.MERGE_BTN' | translate }}</span>
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 shrink-0">
        <!-- Search Input -->
        <div class="flex-1 relative">
          <lucide-icon name="search" class="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2"></lucide-icon>
          <input
            type="text"
            [placeholder]="'TOPICS.SEARCH_PLACEHOLDER' | translate"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            class="w-full bg-subtle/30 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-all" />
        </div>

        <!-- Status Filter -->
        <div class="flex gap-2 shrink-0">
          @for (filter of statusFilters; track filter.value) {
            <button
              (click)="selectedStatus.set(filter.value)"
              [class.bg-primary]="selectedStatus() === filter.value"
              [class.text-white]="selectedStatus() === filter.value"
              [class.bg-subtle/30]="selectedStatus() !== filter.value"
              [class.text-text-secondary]="selectedStatus() !== filter.value"
              [class.border-transparent]="selectedStatus() === filter.value"
              [class.border-border]="selectedStatus() !== filter.value"
              class="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all cursor-pointer">
              {{ filter.label | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Topics Grid -->
      <div class="flex-1 overflow-y-auto min-h-0">
        @if (loading()) {
          <div class="h-60 flex items-center justify-center">
            <lucide-icon name="loader-circle" class="w-8 h-8 text-primary animate-spin"></lucide-icon>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
            @for (topic of filteredTopics(); track topic.topic_id) {
              <app-topic-card [topic]="topic"></app-topic-card>
            } @empty {
              <div class="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div class="w-16 h-16 rounded-full bg-subtle/50 flex items-center justify-center text-text-muted">
                  <lucide-icon name="tags" class="w-8 h-8"></lucide-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-text-primary">{{ 'TOPICS.NO_TOPICS_FOUND' | translate }}</h3>
                  <p class="text-xs text-text-secondary mt-1">{{ 'TOPICS.NO_TOPICS_DESC' | translate }}</p>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Merge Dialog -->
      @if (showMergeDialog()) {
        <app-topic-merge-dialog
          [topics]="topics()"
          (confirm)="onMergeConfirm($event)"
          (cancel)="showMergeDialog.set(false)">
        </app-topic-merge-dialog>
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
export class TopicListComponent implements OnInit, OnDestroy {
  private workspaceStore = inject(WorkspaceStore);
  private topicsApiService = inject(TopicsApiService);
  private toastService = inject(ToastService);

  // States
  topics = signal<Topic[]>([]);
  searchQuery = '';
  debouncedSearchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  loading = signal<boolean>(false);
  showMergeDialog = signal<boolean>(false);

  readonly statusFilters = [
    { label: 'COMMON.ALL', value: 'all' },
    { label: 'TOPICS.STATUS_ACTIVE', value: 'active' },
    { label: 'TOPICS.STATUS_NEEDS_REVIEW', value: 'needs_review' },
    { label: 'TOPICS.STATUS_ARCHIVED', value: 'archived' }
  ];

  // Search input debounce timer
  private searchTimeout: any;

  // Computed filter
  filteredTopics = computed(() => {
    const query = this.debouncedSearchQuery().toLowerCase().trim();
    const status = this.selectedStatus();
    let list = this.topics();

    if (status !== 'all') {
      list = list.filter(t => t.status === status);
    }

    if (query) {
      list = list.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.summary?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  constructor() {
    // Monitor workspace change to reload topics
    effect(() => {
      const workspaceId = this.workspaceStore.currentWorkspaceId();
      if (workspaceId) {
        this.fetchTopics(workspaceId);
      } else {
        this.topics.set([]);
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  fetchTopics(workspaceId: string) {
    this.loading.set(true);
    this.topicsApiService.getTopics(workspaceId).subscribe({
      next: (data) => {
        this.topics.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi fetch topics:', err);
        this.toastService.error('TOPICS.FETCH_ERROR');
        this.loading.set(false);
      }
    });
  }

  onSearchChange(val: string) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.debouncedSearchQuery.set(val);
    }, 300);
  }

  openMergeDialog() {
    this.showMergeDialog.set(true);
  }

  onMergeConfirm(event: { target_topic_id: string; source_topic_ids: string[] }) {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    if (!workspaceId) return;

    this.loading.set(true);
    this.showMergeDialog.set(false);

    this.topicsApiService.mergeTopics(workspaceId, {
      target_topic_id: event.target_topic_id,
      source_topic_ids: event.source_topic_ids
    }).subscribe({
      next: () => {
        this.toastService.success('TOPICS.MERGE_SUCCESS');
        this.fetchTopics(workspaceId);
      },
      error: (err) => {
        console.error('Lỗi khi gộp chủ đề:', err);
        this.toastService.error('TOPICS.MERGE_ERROR');
        this.loading.set(false);
      }
    });
  }
}
