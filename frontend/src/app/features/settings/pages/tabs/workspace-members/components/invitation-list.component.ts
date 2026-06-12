import { Component, input, output } from '@angular/core';
import { WorkspaceInvitation, WorkspaceRole } from '../../../../../../core/models/workspace.model';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../../../../../../shared/ui/badge.component';

@Component({
  selector: 'app-invitation-list',
  standalone: true,
  imports: [LucideAngularModule, BadgeComponent],
  templateUrl: './invitation-list.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class InvitationListComponent {
  invitations = input.required<WorkspaceInvitation[]>();
  currentUserRole = input.required<WorkspaceRole>();
  isLoading = input<boolean>(false);

  invitationRevoked = output<string>();

  canManage(): boolean {
    const role = this.currentUserRole();
    return role === 'owner' || role === 'admin';
  }

  revokeInvitation(invite: WorkspaceInvitation) {
    if (!this.canManage()) return;
    if (confirm(`Bạn có chắc chắn muốn thu hồi lời mời gửi tới email ${invite.email} không?`)) {
      this.invitationRevoked.emit(invite.id);
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

  formatDate(dateString: string): string {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  }

  isExpired(expiresAt: string): boolean {
    try {
      return new Date(expiresAt).getTime() < Date.now();
    } catch {
      return false;
    }
  }
}
