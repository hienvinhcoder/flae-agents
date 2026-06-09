import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { KnowledgeDocument } from '../../../../../core/models/knowledge-base.model';
import { StatusBadgeComponent } from './status-badge.component';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    TranslateModule, 
    StatusBadgeComponent
  ],
  templateUrl: './document-table.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `
  ]
})
export class DocumentTableComponent {
  documents = input.required<KnowledgeDocument[]>();
  loading = input<boolean>(false);

  viewDetail = output<KnowledgeDocument>();
  delete = output<string>();
  retry = output<string>();

  formatBytes(bytes?: number): string {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'pdf':
        return 'file-text';
      case 'markdown':
      case 'text':
        return 'file-code';
      case 'manual_input':
        return 'pencil-line';
      default:
        return 'file';
    }
  }

  getDocumentIconClass(type: string): string {
    switch (type) {
      case 'pdf':
        return 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
      case 'markdown':
        return 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
      case 'text':
        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
      case 'manual_input':
        return 'text-purple-400 bg-purple-500/10 border border-purple-500/20';
      default:
        return 'text-text-muted bg-white/5 border border-border';
    }
  }

  onViewDetail(doc: KnowledgeDocument) {
    this.viewDetail.emit(doc);
  }

  onDelete(event: Event, id: string) {
    event.stopPropagation();
    if (confirm(this.getTranslation('KNOWLEDGE.DELETE_CONFIRM'))) {
      this.delete.emit(id);
    }
  }

  onRetry(event: Event, id: string) {
    event.stopPropagation();
    this.retry.emit(id);
  }

  private getTranslation(key: string): string {
    // Fallback translation helper (tiện dùng khi confirm dialog cần)
    return key === 'KNOWLEDGE.DELETE_CONFIRM' 
      ? 'Bạn có chắc chắn muốn xóa tài liệu này? Dữ liệu đã được xử lý trong cơ sở tri thức cũng sẽ bị xóa.'
      : 'Xác nhận?';
  }
}
