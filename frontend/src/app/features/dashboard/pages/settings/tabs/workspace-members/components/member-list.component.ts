import { Component, input, output } from '@angular/core';
import { WorkspaceMember, WorkspaceRole, WorkspaceMemberStatus } from '../../../../../../../core/models/workspace.model';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../../../../../../../shared/ui/badge.component';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [LucideAngularModule, BadgeComponent],
  templateUrl: './member-list.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class MemberListComponent {
  members = input.required<WorkspaceMember[]>();
  currentUserRole = input.required<WorkspaceRole>();
  currentUserUid = input.required<string>();
  isLoading = input<boolean>(false);

  roleChanged = output<{ userUid: string; newRole: WorkspaceRole }>();
  statusChanged = output<{ userUid: string; newStatus: WorkspaceMemberStatus }>();
  memberRemoved = output<string>();

  // Helper check xem user hiện tại có quyền chỉnh sửa thành viên target hay không
  canManage(targetMember: WorkspaceMember): boolean {
    // Không thể tự chỉnh sửa chính mình
    if (targetMember.user_uid === this.currentUserUid()) {
      return false;
    }

    const myRole = this.currentUserRole();
    
    // Owner có quyền chỉnh sửa tất cả (trừ chính mình)
    if (myRole === 'owner') {
      return true;
    }

    // Admin chỉ có quyền quản lý member và viewer
    if (myRole === 'admin') {
      return targetMember.role === 'member' || targetMember.role === 'viewer';
    }

    // Member và Viewer không có quyền quản lý
    return false;
  }

  // Danh sách các vai trò có thể gán cho một thành viên
  getAvailableRoles(currentRole: WorkspaceRole): WorkspaceRole[] {
    const myRole = this.currentUserRole();
    if (myRole === 'owner') {
      return ['admin', 'member', 'viewer'];
    }
    if (myRole === 'admin') {
      return ['member', 'viewer'];
    }
    return [];
  }

  onRoleChange(userUid: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as WorkspaceRole;
    this.roleChanged.emit({ userUid, newRole });
  }

  toggleStatus(member: WorkspaceMember) {
    if (!this.canManage(member)) return;
    const newStatus: WorkspaceMemberStatus = member.status === 'active' ? 'suspended' : 'active';
    this.statusChanged.emit({ userUid: member.user_uid, newStatus });
  }

  removeMember(member: WorkspaceMember) {
    if (!this.canManage(member)) return;
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${member.full_name} khỏi workspace này không?`)) {
      this.memberRemoved.emit(member.user_uid);
    }
  }

  getRoleBadgeVariant(role: WorkspaceRole): 'primary' | 'ai' | 'default' {
    if (role === 'owner') return 'primary';
    if (role === 'admin') return 'ai';
    return 'default';
  }

  getRoleLabel(role: WorkspaceRole): string {
    const labels: Record<WorkspaceRole, string> = {
      owner: 'Chủ sở hữu',
      admin: 'Quản trị viên',
      member: 'Thành viên',
      viewer: 'Người xem'
    };
    return labels[role];
  }
}
