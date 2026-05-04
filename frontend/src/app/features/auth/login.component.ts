import { Component, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthFormComponent } from './components/auth-form/auth-form.component';
import { MockAuthService } from '../../core/services/mock-auth.service';
import { MockWorkspaceService } from '../../core/services/mock-workspace.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, AuthFormComponent],
  template: `
    <div class="min-h-screen flex bg-mint-white">
      <!-- Left Side: Value Proposition (Hidden on mobile) -->
      <div class="hidden lg:flex lg:w-1/2 relative bg-dark-green items-center justify-center p-12 overflow-hidden">
        <!-- Abstract background elements -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]"></div>
        
        <div class="relative z-10 w-full max-w-lg">
          <div class="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-8 shadow-ai-glow">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/><path d="M12 12l9.9 4.9"/></svg>
          </div>
          <h1 class="text-5xl font-heading font-bold text-white mb-6 leading-tight">
            Tương lai của <br/><span class="text-accent">Quản trị Doanh nghiệp</span>
          </h1>
          <p class="text-white/80 text-lg mb-10 font-sans leading-relaxed">
            Tối ưu hóa luồng công việc, tăng tốc độ ra quyết định và giải phóng tiềm năng đội ngũ với hệ sinh thái AI Agents thông minh từ FLAE.
          </p>
          
          <!-- Feature list -->
          <div class="space-y-5">
            <div class="flex items-center gap-4 text-white/90">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span class="font-medium text-lg">Phân tích dữ liệu thời gian thực</span>
            </div>
            <div class="flex items-center gap-4 text-white/90">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span class="font-medium text-lg">Giao diện hội thoại thông minh</span>
            </div>
            <div class="flex items-center gap-4 text-white/90">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span class="font-medium text-lg">Tự động hóa tác vụ 100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Auth Form -->
      <div class="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <!-- Abstract elements for mobile -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div class="absolute -top-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50"></div>
          <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
        </div>
        
        <div class="relative z-10 w-full max-w-md flex flex-col">
          <!-- Logo for mobile only -->
          <div class="mb-10 flex flex-col items-center lg:hidden">
            <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-ai-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/><path d="M12 12l9.9 4.9"/></svg>
            </div>
            <h1 class="text-3xl font-heading font-bold text-dark-green tracking-tight">FLAE Agent</h1>
          </div>

          <div *ngIf="error()" class="w-full mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3 animate-fade-in-up">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span class="leading-relaxed">{{ error() }}</span>
          </div>

          <app-auth-form 
            [isLoading]="isLoading()"
            (emailLogin)="onEmailLogin($event)"
            (googleLogin)="onGoogleLogin()">
          </app-auth-form>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(MockAuthService);
  private workspaceService = inject(MockWorkspaceService);
  private router = inject(Router);

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  constructor() {
    // Lắng nghe thay đổi trạng thái user để chuyển hướng
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        // Nếu user đăng nhập bằng email invitee@mock.com, có pending invitation
        if (this.workspaceService.pendingInvitation()) {
          this.router.navigate(['/onboarding/accept-invite']);
        } else {
          // Chưa có workspace
          this.router.navigate(['/onboarding/create-workspace']);
        }
      }
    });
  }

  onEmailLogin(credentials: {email: string, password: string}) {
    this.authService.loginWithEmail(credentials.email, credentials.password);
  }

  onGoogleLogin() {
    this.authService.loginWithGoogle();
  }
}
