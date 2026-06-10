import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { KnowledgeDocument } from '../../../../../core/models/knowledge-base.model';
import { IngestionProgressComponent } from './ingestion-progress.component';
import { ButtonComponent } from '../../../../../shared/ui/button.component';

@Component({
  selector: 'app-document-detail-panel',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    TranslateModule, 
    IngestionProgressComponent, 
    ButtonComponent
  ],
  templateUrl: './document-detail-panel.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class DocumentDetailPanelComponent {
  document = input<KnowledgeDocument | null>(null);
  show = input.required<boolean>();
  processing = input<boolean>(false);

  close = output<void>();
  delete = output<string>();
  retry = output<string>();

  tokenPrompt = computed(() => this.document()?.token_usage?.['prompt_tokens'] ?? 0);
  tokenCompletion = computed(() => this.document()?.token_usage?.['completion_tokens'] ?? 0);
  tokenTotal = computed(() => this.document()?.token_usage?.['total_tokens'] ?? 0);

  formatBytes(bytes?: number): string {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onClose() {
    this.close.emit();
  }

  onDelete() {
    const doc = this.document();
    if (doc && confirm('Bạn có chắc chắn muốn xóa tài liệu này? Dữ liệu liên kết trong Graph Database cũng sẽ bị loại bỏ.')) {
      this.delete.emit(doc.id);
    }
  }

  onRetry() {
    const doc = this.document();
    if (doc) {
      this.retry.emit(doc.id);
    }
  }
}
