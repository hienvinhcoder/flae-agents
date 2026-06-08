import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceStore } from '../../../../core/stores/workspace.store';
import { ButtonComponent } from '../../../../shared/ui/button.component';
import { LucideAngularModule } from 'lucide-angular';
import { BadgeComponent } from '../../../../shared/ui/badge.component';
import { WorkspaceApiService } from '../../../../core/services/api/workspace-api.service';
import { Workspace } from '../../../../core/models/workspace.model';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [ButtonComponent, LucideAngularModule, BadgeComponent],
  templateUrl: './invite-accept.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .animate-bounce-slow {
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% {
        transform: translateY(-5%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: none;
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `]
})
export class InviteAcceptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceStore = inject(WorkspaceStore);
  private workspaceApiService = inject(WorkspaceApiService);

  token = signal<string | null>(null);
  isProcessing = signal<boolean>(false);
  isAccepted = signal<boolean>(false);
  
  // Thông tin lời mời hiển thị
  invitationDetails = signal({
    workspaceName: 'Không gian làm việc mới',
    invitedBy: 'Đại diện không gian làm việc',
    role: 'Thành viên',
    roleCode: 'member'
  });

  ngOnInit() {
    // Đọc token từ query parameter ?token=xxx
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);

    // Nếu không có token, cảnh báo và quay về dashboard
    if (!t) {
      alert('Mã xác thực lời mời không hợp lệ!');
      this.router.navigate(['/dashboard']);
    }
  }

  acceptInvitation() {
    const t = this.token();
    if (!t) return;

    this.isProcessing.set(true);

    this.workspaceApiService.acceptInvitation({ token: t }).subscribe({
      next: (newWs: Workspace) => {
        this.isProcessing.set(false);
        this.isAccepted.set(true);

        // Thêm workspace mới nhận được vào store và set active
        this.workspaceStore.addWorkspace(newWs);
        this.workspaceStore.setCurrentWorkspaceId(newWs.id);

        setTimeout(() => {
          // Chuyển hướng người dùng vào trang settings để xem danh sách thành viên mới
          this.router.navigate(['/dashboard/settings']);
        }, 1500);
      },
      error: (err) => {
        this.isProcessing.set(false);
        console.error('Lỗi khi chấp nhận lời mời:', err);
        alert(err.error?.message || 'Không thể chấp nhận lời mời. Token có thể đã hết hạn hoặc không hợp lệ!');
        this.router.navigate(['/dashboard']);
      }
    });
  }

  rejectInvitation() {
    if (confirm('Bạn có chắc chắn muốn từ chối lời mời này không?')) {
      alert('Đã từ chối lời mời.');
      this.router.navigate(['/dashboard']);
    }
  }
}
