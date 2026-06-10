import { Component, OnInit, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceStore } from '../../../../../core/stores/workspace.store';
import { KnowledgeBaseApiService } from '../../../../../core/services/api/knowledge-base-api.service';
import { ConnectionModalService } from '../../../../../core/services/connection-modal.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { KnowledgeDocument, ManualDocumentPayload } from '../../../../../core/models/knowledge-base.model';
import { DocumentTableComponent } from '../ui/document-table.component';
import { UploadModalComponent } from '../ui/upload-modal.component';
import { TextInputModalComponent } from '../ui/text-input-modal.component';
import { DocumentDetailPanelComponent } from '../ui/document-detail-panel.component';
import { ButtonComponent } from '../../../../../shared/ui/button.component';

@Component({
  selector: 'app-knowledge-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    DocumentTableComponent,
    UploadModalComponent,
    TextInputModalComponent,
    DocumentDetailPanelComponent,
    ButtonComponent
  ],
  templateUrl: './knowledge-list.component.html',
  styles: [
    `
      :host {
        display: block;
        padding: 1.5rem;
        height: 100%;
        overflow-y: auto;
      }
    `
  ]
})
export class KnowledgeListComponent implements OnInit, OnDestroy {
  private workspaceStore = inject(WorkspaceStore);
  private apiService = inject(KnowledgeBaseApiService);
  private connectionModalService = inject(ConnectionModalService);
  private toastService = inject(ToastService);

  // States
  documents = signal<KnowledgeDocument[]>([]);
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  
  showUploadModal = signal<boolean>(false);
  showTextModal = signal<boolean>(false);
  showDetailPanel = signal<boolean>(false);
  selectedDocument = signal<KnowledgeDocument | null>(null);

  loading = signal<boolean>(false);
  uploading = signal<boolean>(false);
  savingManual = signal<boolean>(false);
  processingAction = signal<boolean>(false);

  private pollingIntervalId: any = null;


  // Computed filtered list
  filteredDocuments = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();
    let docs = this.documents();

    if (status !== 'all') {
      docs = docs.filter(d => d.status === status);
    }

    if (query) {
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(query) || 
        d.description?.toLowerCase().includes(query) ||
        d.file_name?.toLowerCase().includes(query)
      );
    }

    return docs;
  });

  constructor() {
    // Monitor workspace change to reload
    effect(() => {
      const workspaceId = this.workspaceStore.currentWorkspaceId();
      if (workspaceId) {
        this.fetchDocuments(workspaceId);
      } else {
        this.documents.set([]);
      }
    });
  }

  ngOnInit() {
    // Start fake/real polling for processing status updates every 5 seconds
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  fetchDocuments(workspaceId: string) {
    this.loading.set(true);
    this.apiService.getDocuments(workspaceId).subscribe({
      next: (res) => {
        this.documents.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Lỗi lấy tài liệu từ backend:', err);
        this.documents.set([]);
        this.loading.set(false);
      }
    });
  }

  onUploadFile(data: { file: File; title: string; description?: string }) {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    if (!workspaceId) {
      this.toastService.warning('Vui lòng chọn Workspace trước khi tải tài liệu');
      return;
    }
    this.uploading.set(true);

    this.apiService.uploadDocument(workspaceId, data.file, data.title, data.description).subscribe({
      next: (newDoc) => {
        this.documents.update(list => [newDoc, ...list]);
        this.showUploadModal.set(false);
        this.uploading.set(false);
        this.toastService.success('Tải tài liệu lên thành công! Bắt đầu xử lý...');
        this.startPolling();
      },
      error: (err) => {
        console.error('Lỗi khi tải tài liệu lên backend:', err);
        this.uploading.set(false);
      }
    });
  }

  onManualInput(data: ManualDocumentPayload) {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    if (!workspaceId) {
      this.toastService.warning('Vui lòng chọn Workspace trước khi tạo tài liệu');
      return;
    }
    this.savingManual.set(true);

    this.apiService.createManualDocument(workspaceId, data).subscribe({
      next: (newDoc) => {
        this.documents.update(list => [newDoc, ...list]);
        this.showTextModal.set(false);
        this.savingManual.set(false);
        this.toastService.success('Đã lưu nội dung thành công! Bắt đầu xử lý...');
        this.startPolling();
      },
      error: (err) => {
        console.error('Lỗi khi tạo tài liệu thủ công:', err);
        this.savingManual.set(false);
      }
    });
  }

  onDeleteDocument(id: string) {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    if (!workspaceId) return;
    this.processingAction.set(true);

    this.apiService.deleteDocument(workspaceId, id).subscribe({
      next: (success) => {
        if (success) {
          this.documents.update(list => list.filter(d => d.id !== id));
          if (this.selectedDocument()?.id === id) {
            this.showDetailPanel.set(false);
            this.selectedDocument.set(null);
          }
          this.toastService.success('Đã xóa tài liệu khỏi cơ sở tri thức.');
        }
        this.processingAction.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi xóa tài liệu:', err);
        this.processingAction.set(false);
      }
    });
  }

  onRetryIngestion(id: string) {
    const workspaceId = this.workspaceStore.currentWorkspaceId();
    if (!workspaceId) return;
    this.processingAction.set(true);

    this.apiService.retryIngestion(workspaceId, id).subscribe({
      next: (updatedDoc) => {
        this.documents.update(list => list.map(d => d.id === id ? updatedDoc : d));
        if (this.selectedDocument()?.id === id) {
          this.selectedDocument.set(updatedDoc);
        }
        this.processingAction.set(false);
        this.toastService.success('Đã yêu cầu xử lý lại tài liệu.');
        this.startPolling();
      },
      error: (err) => {
        console.error('Lỗi khi xử lý lại tài liệu:', err);
        this.processingAction.set(false);
      }
    });
  }

  onViewDetail(doc: KnowledgeDocument) {
    this.selectedDocument.set(doc);
    this.showDetailPanel.set(true);
  }

  closeDetailPanel() {
    this.showDetailPanel.set(false);
    this.selectedDocument.set(null);
  }

  // Polling updates
  private startPolling() {
    if (this.pollingIntervalId) return;
    this.pollingIntervalId = setInterval(() => {
      // Check if there are processing docs
      const workspaceId = this.workspaceStore.currentWorkspaceId();
      const hasProcessing = this.documents().some(d => d.status === 'processing' || d.status === 'pending');
      
      // Chỉ gửi request polling nếu có tài liệu đang xử lý, có workspace và server không bị down
      if (hasProcessing && workspaceId && !this.connectionModalService.isServerDown()) {
        this.apiService.getDocuments(workspaceId).subscribe({
          next: (res) => {
            if (res) {
              this.documents.set(res);
              // Update selected detail if open
              const selected = this.selectedDocument();
              if (selected) {
                const updated = res.find(d => d.id === selected.id);
                if (updated) this.selectedDocument.set(updated);
              }
            }
          },
          error: (err) => {
            console.error('[KnowledgeList Polling] Lỗi lấy tài liệu từ backend:', err);
          }
        });
      } else if (!hasProcessing) {
        this.stopPolling();
      }
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }
}
