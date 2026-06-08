import { Component, inject, signal, computed, effect } from '@angular/core';
import { WorkspaceStore } from '../../../../../../core/stores/workspace.store';
import { AuthStore } from '../../../../../../core/stores/auth.store';
import { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, WorkspaceMemberStatus } from '../../../../../../core/models/workspace.model';
import { MemberListComponent } from './components/member-list.component';
import { InvitationListComponent } from './components/invitation-list.component';
import { InviteModalComponent } from './components/invite-modal.component';
import { ButtonComponent } from '../../../../../../shared/ui/button.component';
import { LucideAngularModule } from 'lucide-angular';
import { WorkspaceApiService } from '../../../../../../core/services/api/workspace-api.service';

@Component({
  selector: 'app-workspace-members',
  standalone: true,
  imports: [
    MemberListComponent,
    InvitationListComponent,
    InviteModalComponent,
    ButtonComponent,
    LucideAngularModule
  ],
  templateUrl: './workspace-members.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class WorkspaceMembersComponent {
  workspaceStore = inject(WorkspaceStore);
  authStore = inject(AuthStore);
  private workspaceApiService = inject(WorkspaceApiService);

  // State Signals
  members = signal<WorkspaceMember[]>([]);
  invitations = signal<WorkspaceInvitation[]>([]);
  isLoading = signal<boolean>(false);
  
  isInviteModalOpen = signal<boolean>(false);
  isInviting = signal<boolean>(false);

  // Lấy UID của user đang đăng nhập
  currentUserUid = computed(() => {
    return this.authStore.currentUser()?.firebase_uid || '';
  });

  // Xác định vai trò của user hiện tại trong Workspace
  currentUserRole = computed<WorkspaceRole>(() => {
    const uid = this.currentUserUid();
    const match = this.members().find(m => m.user_uid === uid);
    return match ? match.role : 'member';
  });

  constructor() {
    effect(() => {
      const currentWs = this.workspaceStore.currentWorkspace();
      if (currentWs) {
        this.loadData(currentWs.id);
      }
    });
  }

  loadData(workspaceId: string) {
    this.isLoading.set(true);
    
    // Tải danh sách thành viên thực tế
    this.workspaceApiService.getWorkspaceMembers(workspaceId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi load members:', err);
        this.isLoading.set(false);
      }
    });

    // Tải danh sách lời mời pending thực tế
    this.workspaceApiService.getPendingInvitations(workspaceId).subscribe({
      next: (invitations) => {
        this.invitations.set(invitations);
      },
      error: (err) => {
        console.error('Lỗi khi load invitations:', err);
      }
    });
  }

  // --- Handlers ---
  
  onRoleChanged(event: { userUid: string; newRole: WorkspaceRole }) {
    const currentWs = this.workspaceStore.currentWorkspace();
    if (!currentWs) return;

    const target = this.members().find(m => m.user_uid === event.userUid);
    if (!target) return;

    this.workspaceApiService.updateMemberRole(currentWs.id, event.userUid, {
      role: event.newRole,
      status: target.status
    }).subscribe({
      next: (updatedMember) => {
        // Cập nhật lại UI list
        this.members.update(list => 
          list.map(m => m.user_uid === event.userUid ? { ...m, role: updatedMember.role } : m)
        );
        alert('Đã cập nhật vai trò thành công!');
      },
      error: (err) => {
        console.error('Lỗi khi update role:', err);
        alert(err.error?.message || 'Không thể thay đổi vai trò. Vui lòng thử lại!');
      }
    });
  }

  onStatusChanged(event: { userUid: string; newStatus: WorkspaceMemberStatus }) {
    const currentWs = this.workspaceStore.currentWorkspace();
    if (!currentWs) return;

    const target = this.members().find(m => m.user_uid === event.userUid);
    if (!target) return;

    this.workspaceApiService.updateMemberRole(currentWs.id, event.userUid, {
      role: target.role,
      status: event.newStatus
    }).subscribe({
      next: (updatedMember) => {
        this.members.update(list => 
          list.map(m => m.user_uid === event.userUid ? { ...m, status: updatedMember.status } : m)
        );
        alert('Đã cập nhật trạng thái thành công!');
      },
      error: (err) => {
        console.error('Lỗi khi update status:', err);
        alert(err.error?.message || 'Không thể thay đổi trạng thái. Vui lòng thử lại!');
      }
    });
  }

  onMemberRemoved(userUid: string) {
    const currentWs = this.workspaceStore.currentWorkspace();
    if (!currentWs) return;

    if (confirm('Bạn có chắc chắn muốn xóa thành viên này ra khỏi không gian làm việc?')) {
      this.workspaceApiService.removeMember(currentWs.id, userUid).subscribe({
        next: (success) => {
          if (success) {
            this.members.update(list => list.filter(m => m.user_uid !== userUid));
            alert('Đã xóa thành viên thành công!');
          }
        },
        error: (err) => {
          console.error('Lỗi khi xóa member:', err);
          alert(err.error?.message || 'Không thể xóa thành viên. Vui lòng thử lại!');
        }
      });
    }
  }

  onInvitationRevoked(id: string) {
    // Khi xoá pending invitation, ta tạm thời cập nhật UI (do chưa định nghĩa API DELETE invitation ở Backend)
    this.invitations.update(list => list.filter(i => i.id !== id));
  }

  openInviteModal() {
    this.isInviteModalOpen.set(true);
  }

  closeInviteModal() {
    this.isInviteModalOpen.set(false);
  }

  onInvited(payload: { email: string; role: WorkspaceRole }) {
    const currentWs = this.workspaceStore.currentWorkspace();
    if (!currentWs) return;

    this.isInviting.set(true);
    
    this.workspaceApiService.inviteMember(currentWs.id, {
      email: payload.email,
      role: payload.role
    }).subscribe({
      next: (newInvite) => {
        this.invitations.update(list => [newInvite, ...list]);
        this.isInviting.set(false);
        this.isInviteModalOpen.set(false);
        alert(`Đã gửi email lời mời thành công tới: ${payload.email}`);
      },
      error: (err) => {
        this.isInviting.set(false);
        console.error('Lỗi khi gửi lời mời:', err);
        alert(err.error?.message || 'Không thể gửi lời mời. Vui lòng thử lại!');
      }
    });
  }
}
