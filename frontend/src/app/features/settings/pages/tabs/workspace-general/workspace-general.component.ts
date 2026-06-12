import { Component, inject, signal, input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkspaceStore } from '../../../../../core/stores/workspace.store';
import { WorkspaceFormComponent } from './components/workspace-form.component';
import { CreateManualWorkspacePayload, Workspace } from '../../../../../core/models/workspace.model';
import { WorkspaceApiService } from '../../../../../core/services/api/workspace-api.service';

@Component({
  selector: 'app-workspace-general',
  standalone: true,
  imports: [WorkspaceFormComponent],
  templateUrl: './workspace-general.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class WorkspaceGeneralComponent {
  workspaceStore = inject(WorkspaceStore);
  private workspaceApiService = inject(WorkspaceApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isCreateMode = input<boolean>(false);
  currentWorkspace = this.workspaceStore.currentWorkspace;
  isSaving = signal<boolean>(false);

  onSaveWorkspace(payload: CreateManualWorkspacePayload) {
    this.isSaving.set(true);

    if (this.isCreateMode()) {
      this.workspaceApiService.createManualWorkspace(payload).subscribe({
        next: (newWs: Workspace) => {
          this.workspaceStore.addWorkspace(newWs);
          this.workspaceStore.setCurrentWorkspaceId(newWs.id);
          this.isSaving.set(false);
          alert('Đã tạo không gian làm việc mới thành công!');
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { mode: null },
            queryParamsHandling: 'merge'
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          console.error('Lỗi khi tạo workspace:', err);
          alert('Không thể tạo không gian làm việc mới. Vui lòng thử lại!');
        }
      });
    } else {
      const current = this.currentWorkspace();
      if (!current) {
        this.isSaving.set(false);
        return;
      }

      this.workspaceApiService.updateWorkspace(current.id, payload).subscribe({
        next: (updatedWs: Workspace) => {
          const allWorkspaces = this.workspaceStore.workspaces();
          const updatedList = allWorkspaces.map(ws => ws.id === current.id ? updatedWs : ws);
          this.workspaceStore.setWorkspaces(updatedList);
          this.isSaving.set(false);
          alert('Đã cập nhật thông tin không gian làm việc thành công!');
        },
        error: (err) => {
          this.isSaving.set(false);
          console.error('Lỗi khi cập nhật workspace:', err);
          alert('Không thể cập nhật không gian làm việc. Vui lòng thử lại!');
        }
      });
    }
  }

  onCancel() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
      queryParamsHandling: 'merge'
    });
  }
}
