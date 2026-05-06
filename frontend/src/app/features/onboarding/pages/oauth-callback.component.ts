import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceApiService } from '../../../core/services/api/workspace-api.service';
import { WorkspaceStore } from '../../../core/stores/workspace.store';
import { PlatformType, HandleOauthCallbackPayload } from '../../../core/models/workspace.model';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-mint-white p-4 overflow-hidden font-sans text-dark-green">
      
      <!-- Glow blobs -->
      <div class="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div class="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-accent/20 blur-[150px] pointer-events-none"></div>

      <div class="relative w-full max-w-md bg-white/70 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_rgba(6,46,36,0.06)] border border-white p-10 text-center animate-fade-in-up">
        
        <div *ngIf="isLoading()" class="animate-fade-in-up">
          <div class="relative w-24 h-24 mx-auto mb-8">
            <!-- Outer spinning ring with glow -->
            <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-accent animate-spin shadow-ai-glow"></div>
            <!-- Inner ring -->
            <div class="absolute inset-2 rounded-full border-4 border-transparent border-b-primary animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
            <!-- Center core -->
            <div class="absolute inset-6 bg-gradient-to-br from-primary to-accent rounded-full shadow-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
          </div>
          
          <h2 class="text-2xl font-heading font-bold text-dark-green tracking-tight mb-3">Đang đồng bộ AI...</h2>
          <p class="text-dark-green/60 text-sm leading-relaxed">Hệ thống đang phân tích và thiết lập không gian làm việc thông minh cho bạn. Vui lòng không đóng trang này.</p>
        </div>

        <div *ngIf="error()" class="animate-fade-in-up">
          <div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-red-50/50">
            <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </div>
          <h2 class="text-2xl font-heading font-bold text-dark-green tracking-tight mb-3">Kết nối bị lỗi</h2>
          <p class="text-red-500 text-sm mb-8 bg-red-50 p-4 rounded-xl border border-red-100">{{ error() }}</p>
          
          <button 
            (click)="goBack()"
            class="w-full py-4 px-6 bg-white border-2 border-soft-green text-dark-green font-semibold rounded-2xl hover:bg-mint-white hover:border-primary/30 transition-all duration-300">
            Thử lại sau
          </button>
        </div>

      </div>
    </div>
  `
})
export class OauthCallbackComponent implements OnInit {
  isLoading = signal(true);
  error = signal<string | null>(null);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceApi = inject(WorkspaceApiService);
  private workspaceStore = inject(WorkspaceStore);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const errorParam = params['error'];

      if (errorParam) {
        this.isLoading.set(false);
        this.error.set('Bạn đã từ chối cấp quyền hoặc có lỗi từ nền tảng.');
        return;
      }

      if (!code) {
        this.isLoading.set(false);
        this.error.set('Không tìm thấy mã xác thực hợp lệ.');
        return;
      }

      const platform = sessionStorage.getItem('oauth_platform') as PlatformType;
      const shopDomain = sessionStorage.getItem('oauth_shop_domain') || undefined;

      if (!platform) {
        this.isLoading.set(false);
        this.error.set('Lỗi dữ liệu phiên bản, không xác định được nền tảng.');
        return;
      }

      this.handleCallback(platform, code, shopDomain);
    });
  }

  private handleCallback(platform: PlatformType, code: string, shop_domain?: string) {
    const payload: HandleOauthCallbackPayload = { platform, code, shop_domain };
    
    this.workspaceApi.handleOauthCallback(payload).subscribe({
      next: (workspace) => {
        sessionStorage.removeItem('oauth_platform');
        sessionStorage.removeItem('oauth_shop_domain');

        this.workspaceStore.addWorkspace(workspace);
        this.workspaceStore.setCurrentWorkspaceId(workspace.id);
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Có lỗi xảy ra trong quá trình đồng bộ.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/onboarding/create-workspace']);
  }
}
