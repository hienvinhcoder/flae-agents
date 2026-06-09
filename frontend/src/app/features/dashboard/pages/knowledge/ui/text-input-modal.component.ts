import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../../shared/ui/button.component';
import { ManualDocumentPayload } from '../../../../../core/models/knowledge-base.model';

@Component({
  selector: 'app-text-input-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    TranslateModule, 
    ButtonComponent
  ],
  templateUrl: './text-input-modal.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class TextInputModalComponent {
  show = input.required<boolean>();
  saving = input<boolean>(false);

  close = output<void>();
  submitText = output<ManualDocumentPayload>();

  title = signal<string>('');
  description = signal<string>('');
  contentText = signal<string>('');
  activeTab = signal<'edit' | 'preview'>('edit');
  errorMessage = signal<string | null>(null);

  renderedPreview = computed(() => {
    const text = this.contentText().trim();
    if (!text) {
      return '<p class="text-text-disabled italic text-center py-8">Chưa có nội dung soạn thảo để xem trước.</p>';
    }

    // A very simple markdown preview parser
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h5 class="text-sm font-bold text-text-primary mt-3 mb-1.5">$1</h5>')
      .replace(/^## (.*$)/gim, '<h4 class="text-base font-bold text-text-primary mt-4 mb-2 border-b border-border pb-1">$1</h4>')
      .replace(/^# (.*$)/gim, '<h3 class="text-lg font-bold text-text-primary mt-5 mb-2.5 border-b border-border-strong pb-1.5">$1</h3>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-app border border-border p-3 rounded-lg font-mono text-xs text-text-secondary overflow-x-auto my-3">$1</pre>')
      // Bold / Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Bullet points
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="list-disc ml-5 text-sm text-text-secondary my-1">$1</li>')
      // Paragraphs (split by double newlines)
      .split('\n\n')
      .map(para => {
        if (para.trim().startsWith('<h') || para.trim().startsWith('<pre') || para.trim().startsWith('<li')) {
          return para;
        }
        return `<p class="text-sm text-text-secondary leading-relaxed mb-3">${para.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
  });

  onClose() {
    this.resetForm();
    this.close.emit();
  }

  setTab(tab: 'edit' | 'preview') {
    this.activeTab.set(tab);
  }

  onSubmit() {
    this.errorMessage.set(null);

    if (!this.title().trim()) {
      this.errorMessage.set('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    if (!this.contentText().trim()) {
      this.errorMessage.set('Vui lòng nhập nội dung chi tiết.');
      return;
    }

    this.submitText.emit({
      title: this.title().trim(),
      description: this.description().trim() || undefined,
      content_text: this.contentText().trim()
    });
  }

  private resetForm() {
    this.title.set('');
    this.description.set('');
    this.contentText.set('');
    this.activeTab.set('edit');
    this.errorMessage.set(null);
  }
}
