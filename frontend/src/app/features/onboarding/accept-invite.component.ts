import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MockWorkspaceService } from '../../core/services/mock-workspace.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-mint-white p-4">
      <div class="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(6,46,36,0.05)] border border-white/20 p-8 text-center relative overflow-hidden">
        
        <div *ngIf="error()" class="w-full mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {{ error() }}
        </div>

        <div *ngIf="!invite" class="py-8">
          <p class="text-dark-green/60">Không tìm thấy lời mời hoặc lời mời đã hết hạn.</p>
          <button (click)="goBack()" class="mt-6 text-primary hover:text-primary/80 font-medium">Quay lại</button>
        </div>

        <div *ngIf="invite">
          <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <svg class="w-8 h-8 text-primary transform -rotate-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 class="text-2xl font-heading font-bold text-dark-green tracking-tight mb-2">Lời mời tham gia</h2>
          <p class="text-dark-green/60 mb-8 text-sm">
            Bạn đã được mời tham gia Workspace <span class="font-semibold text-dark-green">{{ invite.workspaceName }}</span> với vai trò <span class="font-semibold text-primary">{{ invite.role }}</span>.
          </p>
          
          <div class="flex flex-col gap-3">
            <button 
              (click)="onAccept()"
              [disabled]="isLoading()"
              class="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 hover:shadow-ai-glow transition-all duration-200 disabled:opacity-50 flex justify-center items-center">
              <span *ngIf="isLoading()" class="mr-2">
                 <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              </span>
              Chấp nhận lời mời
            </button>
            <button 
              (click)="onDecline()"
              [disabled]="isLoading()"
              class="w-full py-3 px-4 bg-transparent border border-soft-green text-dark-green font-medium rounded-xl hover:bg-mint-white transition-all duration-200 disabled:opacity-50">
              Từ chối
            </button>
          </div>
        </div>

      </div>
    </div>
  `
})
export class AcceptInviteComponent implements OnInit {
  private workspaceService = inject(MockWorkspaceService);
  private router = inject(Router);

  isLoading = this.workspaceService.isLoading;
  error = this.workspaceService.error;
  invite = this.workspaceService.pendingInvitation();

  ngOnInit() {
    // Nếu không có invite nào trong state, có thể người dùng refresh trang -> quay về login
    if (!this.invite) {
      // Trong thực tế, có thể lấy ID từ URL và gọi API lấy chi tiết.
      // Ở đây ta dùng mock data.
    }
  }

  async onAccept() {
    if (this.invite) {
      try {
        await this.workspaceService.acceptInvitation(this.invite.id);
        alert('Đã vào Workspace thành công!');
      } catch (e) {
        // Lỗi đã được báo lên signal
      }
    }
  }

  onDecline() {
    alert('Đã từ chối lời mời!');
    this.router.navigate(['/auth/login']);
  }

  goBack() {
    this.router.navigate(['/auth/login']);
  }
}
