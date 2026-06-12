import { Component, computed, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../../shared/ui/button.component';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    TranslateModule, 
    ButtonComponent
  ],
  templateUrl: './upload-modal.component.html',
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class UploadModalComponent {
  show = input.required<boolean>();
  uploading = input<boolean>(false);

  close = output<void>();
  uploadFile = output<{ file: File; title: string; description?: string }>();

  selectedFile = signal<File | null>(null);
  title = signal<string>('');
  description = signal<string>('');
  dragOver = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.show()) {
        this.resetForm();
      }
    });
  }

  allowedExtensions = ['.pdf', '.md', '.txt'];
  maxFileSize = 50 * 1024 * 1024; // 50MB

  fileInfo = computed(() => {
    const file = this.selectedFile();
    if (!file) return null;
    return {
      name: file.name,
      size: this.formatBytes(file.size),
      type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
    };
  });

  onClose() {
    this.resetForm();
    this.close.emit();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    this.errorMessage.set(null);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    this.errorMessage.set(null);
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  removeFile() {
    this.selectedFile.set(null);
  }

  onSubmit() {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Vui lòng chọn một tệp để tải lên.');
      return;
    }
    if (!this.title().trim()) {
      this.errorMessage.set('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    this.uploadFile.emit({
      file,
      title: this.title().trim(),
      description: this.description().trim() || undefined
    });
  }

  private handleFile(file: File) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      this.errorMessage.set('Định dạng tệp không được hỗ trợ. Chỉ nhận: PDF, MD, TXT.');
      return;
    }

    if (file.size > this.maxFileSize) {
      this.errorMessage.set('Tệp vượt quá kích thước giới hạn (50MB).');
      return;
    }

    this.selectedFile.set(file);
    
    // Auto-populate title if empty
    if (!this.title().trim()) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      this.title.set(nameWithoutExt);
    }
  }

  private resetForm() {
    this.selectedFile.set(null);
    this.title.set('');
    this.description.set('');
    this.errorMessage.set(null);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
