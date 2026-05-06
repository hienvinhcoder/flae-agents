import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceApiService } from '../../../core/services/api/workspace-api.service';
import { WorkspaceStore } from '../../../core/stores/workspace.store';
import { PlatformSelectorComponent } from '../components/platform-selector.component';
import { ManualWorkspaceFormComponent } from '../components/manual-workspace-form.component';
import { OauthDomainFormComponent } from '../components/oauth-domain-form.component';
import { PlatformType, CreateManualWorkspacePayload, GetOauthUrlPayload } from '../../../core/models/workspace.model';

@Component({
  selector: 'app-onboarding-container',
  standalone: true,
  imports: [CommonModule, PlatformSelectorComponent, ManualWorkspaceFormComponent, OauthDomainFormComponent],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-mint-white p-4 sm:p-8 overflow-hidden font-sans text-dark-green">
      <!-- Glow blobs -->
      <div class="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div class="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-accent/20 blur-[150px] pointer-events-none"></div>
      
      <div class="relative w-full max-w-4xl bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(6,46,36,0.06)] border border-white p-8 md:p-12 z-10">
        
        <!-- STEP 1: Platform Selection -->
        <div *ngIf="selectedPlatform() === null" class="animate-fade-in-up">
          <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl mb-6 shadow-sm">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h2 class="text-3xl md:text-4xl font-heading font-bold text-dark-green tracking-tight mb-4">
              Khởi tạo Workspace
            </h2>
            <p class="text-dark-green/60 text-base md:text-lg max-w-2xl mx-auto">
              Lựa chọn phương thức kết nối dữ liệu để AI bắt đầu quá trình học và cá nhân hóa trải nghiệm cho doanh nghiệp của bạn.
            </p>
          </div>

          <app-platform-selector 
            [selectedPlatform]="selectedPlatform()"
            (platformSelect)="onPlatformSelect($event)">
          </app-platform-selector>
        </div>

        <!-- STEP 2: Forms -->
        <div *ngIf="selectedPlatform() !== null" class="animate-fade-in-up">
          <div class="mb-8">
            <button (click)="goBack()" class="inline-flex items-center text-dark-green/50 hover:text-primary transition-colors text-sm font-semibold mb-6 group">
              <svg class="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
              Quay lại chọn nền tảng
            </button>
            <h2 class="text-2xl md:text-3xl font-heading font-bold text-dark-green tracking-tight mb-2">
              {{ getStepTitle() }}
            </h2>
            <p class="text-dark-green/60 text-base">
              {{ getStepDescription() }}
            </p>
          </div>

          <app-manual-workspace-form
            *ngIf="selectedPlatform() === PlatformType.MANUAL"
            [isLoading]="isLoading()"
            [error]="error()"
            (submitForm)="onCreateManualWorkspace($event)">
          </app-manual-workspace-form>

          <app-oauth-domain-form
            *ngIf="selectedPlatform() === PlatformType.HARAVAN || selectedPlatform() === PlatformType.KIOTVIET"
            [platform]="selectedPlatform()!"
            [isLoading]="isLoading()"
            [error]="error()"
            (submitOauth)="onGetOauthUrl($event)">
          </app-oauth-domain-form>
        </div>

      </div>
    </div>
  `
})
export class OnboardingContainerComponent {
  selectedPlatform = signal<PlatformType | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  private workspaceApi = inject(WorkspaceApiService);
  private workspaceStore = inject(WorkspaceStore);
  private router = inject(Router);

  PlatformType = PlatformType;

  onPlatformSelect(platform: PlatformType) {
    this.selectedPlatform.set(platform);
    this.error.set(null);
  }

  goBack() {
    this.selectedPlatform.set(null);
    this.error.set(null);
  }

  getStepTitle(): string {
    const p = this.selectedPlatform();
    if (p === PlatformType.MANUAL) return 'Thiết lập thủ công';
    if (p === PlatformType.HARAVAN) return 'Kết nối Haravan';
    if (p === PlatformType.KIOTVIET) return 'Kết nối KiotViet';
    return '';
  }

  getStepDescription(): string {
    const p = this.selectedPlatform();
    if (p === PlatformType.MANUAL) return 'Điền thông tin chi tiết để thiết lập không gian làm việc của bạn từ đầu.';
    if (p === PlatformType.HARAVAN || p === PlatformType.KIOTVIET) return 'Hệ thống sẽ đồng bộ khách hàng, đơn hàng và sản phẩm tự động.';
    return '';
  }

  onCreateManualWorkspace(payload: CreateManualWorkspacePayload) {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.workspaceApi.createManualWorkspace(payload).subscribe({
      next: (workspace) => {
        this.workspaceStore.addWorkspace(workspace);
        this.workspaceStore.setCurrentWorkspaceId(workspace.id);
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']); 
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Có lỗi xảy ra khi tạo workspace');
      }
    });
  }

  onGetOauthUrl(payload: { shop_domain?: string }) {
    this.isLoading.set(true);
    this.error.set(null);

    const apiPayload: GetOauthUrlPayload = {
      platform: this.selectedPlatform()!,
      shop_domain: payload.shop_domain
    };

    if (apiPayload.shop_domain) {
      sessionStorage.setItem('oauth_shop_domain', apiPayload.shop_domain);
    }
    sessionStorage.setItem('oauth_platform', apiPayload.platform);

    this.workspaceApi.getOauthUrl(apiPayload).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        window.location.href = response.auth_url; 
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.message || 'Không lấy được URL xác thực');
      }
    });
  }
}
