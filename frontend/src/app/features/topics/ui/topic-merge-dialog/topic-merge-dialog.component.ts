import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Topic } from '../../../../core/models/topic.model';

@Component({
  selector: 'app-topic-merge-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app/80 backdrop-blur-sm select-none">
      <div class="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <lucide-icon name="git-merge" class="w-5 h-5 text-primary"></lucide-icon>
            <h3 class="text-base font-bold text-text-primary">
              {{ 'TOPICS.MERGE_DIALOG_TITLE' | translate }}
            </h3>
          </div>
          <button (click)="cancel.emit()" class="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 overflow-y-auto space-y-5">
          
          <div class="bg-primary-soft/30 border border-primary/10 rounded-xl p-4 flex gap-3 text-xs text-text-secondary">
            <lucide-icon name="info" class="w-4 h-4 text-primary shrink-0 mt-0.5"></lucide-icon>
            <p>{{ 'TOPICS.MERGE_CONFIRM_MSG' | translate }}</p>
          </div>

          <!-- Target Selection -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-text-secondary">
              {{ 'TOPICS.MERGE_TARGET_LABEL' | translate }} *
            </label>
            <select
              [(ngModel)]="selectedTargetId"
              (change)="onTargetChange()"
              class="w-full bg-surface border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer">
              <option value="" disabled>{{ 'TOPICS.SEARCH_PLACEHOLDER' | translate }}</option>
              @for (t of topics(); track t.topic_id) {
                <option [value]="t.topic_id">{{ t.name }} ({{ t.type }})</option>
              }
            </select>
          </div>

          <!-- Sources Selection -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-text-secondary block">
              {{ 'TOPICS.MERGE_SOURCES_LABEL' | translate }} *
            </label>
            
            <div class="border border-border rounded-lg max-h-45 overflow-y-auto divide-y divide-border/60">
              @for (s of availableSources(); track s.topic_id) {
                <label class="flex items-center gap-3 px-3 py-2 hover:bg-subtle/40 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    [checked]="selectedSourceIds().includes(s.topic_id)"
                    (change)="toggleSource(s.topic_id)"
                    class="rounded border-border text-primary focus:ring-primary/20 cursor-pointer w-4 h-4" />
                  <span class="text-text-primary">{{ s.name }}</span>
                  <span class="text-[10px] bg-subtle text-text-muted px-1.5 py-0.5 rounded font-mono ml-auto">
                    {{ s.type }}
                  </span>
                </label>
              } @empty {
                <div class="p-4 text-center text-xs text-text-muted">
                  Vui lòng chọn chủ đề đích trước.
                </div>
              }
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-subtle/10 shrink-0">
          <button
            (click)="cancel.emit()"
            class="px-4 py-2 border border-border hover:bg-subtle/50 text-text-primary rounded-lg text-sm transition-all cursor-pointer">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          
          <button
            [disabled]="!selectedTargetId || selectedSourceIds().length === 0"
            (click)="onConfirm()"
            class="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all cursor-pointer">
            {{ 'COMMON.CONFIRM' | translate }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class TopicMergeDialogComponent {
  topics = input.required<Topic[]>();
  confirm = output<{ target_topic_id: string; source_topic_ids: string[] }>();
  cancel = output<void>();

  selectedTargetId: string = '';
  selectedSourceIds = signal<string[]>([]);

  // Danh sách các topic nguồn khả dụng (loại bỏ topic đích đã chọn)
  availableSources = computed(() => {
    if (!this.selectedTargetId) return [];
    return this.topics().filter(t => t.topic_id !== this.selectedTargetId);
  });

  onTargetChange() {
    // Reset selections nguồn khi đổi target
    this.selectedSourceIds.set([]);
  }

  toggleSource(id: string) {
    const current = this.selectedSourceIds();
    if (current.includes(id)) {
      this.selectedSourceIds.set(current.filter(x => x !== id));
    } else {
      this.selectedSourceIds.set([...current, id]);
    }
  }

  onConfirm() {
    if (this.selectedTargetId && this.selectedSourceIds().length > 0) {
      this.confirm.emit({
        target_topic_id: this.selectedTargetId,
        source_topic_ids: this.selectedSourceIds()
      });
    }
  }
}
