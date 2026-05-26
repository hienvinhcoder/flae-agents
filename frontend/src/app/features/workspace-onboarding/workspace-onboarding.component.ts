import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingMethodSelectorComponent } from './ui/onboarding-method-selector.component';
import { ManualCreationFormComponent } from './ui/manual-creation-form.component';
import { OauthRedirectLoadingComponent } from './ui/oauth-redirect-loading.component';
import { PlatformType, CreateManualWorkspacePayload } from '../../core/models/workspace.model';
import { WorkspaceApiService } from '../../core/services/api/workspace-api.service';
import { WorkspaceStore } from '../../core/stores/workspace.store';

@Component({
  selector: 'app-workspace-onboarding',
  standalone: true,
  imports: [
    CommonModule, 
    OnboardingMethodSelectorComponent, 
    ManualCreationFormComponent, 
    OauthRedirectLoadingComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-heading">
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-extrabold tracking-tight text-gray-900">FLAE<span class="text-cta">AGENTS</span></h1>
      </div>

      <div class="bg-background w-full max-w-lg rounded-2xl shadow-md border border-gray-200 p-8 lg:p-10 transition-all duration-300">
        @switch (currentStep()) {
          @case ('selector') {
            <app-onboarding-method-selector 
              (selectMethod)="onMethodSelected($event)" 
            />
          }
          @case ('manual') {
            <app-manual-creation-form 
              [isSubmitting]="isSubmitting()"
              (goBack)="currentStep.set('selector')"
              (submitForm)="onManualSubmit($event)"
            />
          }
          @case ('oauth') {
            <app-oauth-redirect-loading 
              [providerName]="selectedProviderName()"
            />
          }
        }
        
        @if (errorMessage()) {
          <div class="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center font-medium">
            {{ errorMessage() }}
          </div>
        }
      </div>
    </div>
  `
})
export class WorkspaceOnboardingComponent {
  private router = inject(Router);
  private workspaceApi = inject(WorkspaceApiService);
  private workspaceStore = inject(WorkspaceStore);

  currentStep = signal<'selector' | 'manual' | 'oauth'>('selector');
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  selectedProviderName = signal<string>('');

  onMethodSelected(method: 'manual' | 'haravan' | 'kiotviet') {
    this.errorMessage.set(null);
    if (method === 'manual') {
      this.currentStep.set('manual');
    } else {
      this.selectedProviderName.set(method === 'haravan' ? 'Haravan' : 'KiotViet');
      this.currentStep.set('oauth');
      this.initOauthFlow(method as PlatformType);
    }
  }

  onManualSubmit(payload: CreateManualWorkspacePayload) {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    
    this.workspaceApi.createManualWorkspace(payload).subscribe({
      next: (workspace) => {
        this.workspaceStore.addWorkspace(workspace);
        this.workspaceStore.setCurrentWorkspaceId(workspace.id);
        this.isSubmitting.set(false);
        this.router.navigate(['/dashboard']); // or /admin
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi tạo cửa hàng. Vui lòng thử lại.');
      }
    });
  }

  initOauthFlow(platform: PlatformType) {
    this.workspaceApi.getOauthUrl({ platform }).subscribe({
      next: (res) => {
        window.location.href = res.auth_url;
      },
      error: (err) => {
        this.currentStep.set('selector');
        this.errorMessage.set('Không thể kết nối đến nền tảng này lúc này. Vui lòng thử lại sau.');
      }
    });
  }
}
