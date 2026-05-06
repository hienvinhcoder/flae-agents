import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/stores/auth.store';
import { AuthService } from '../../../core/services/auth.service';
import { LoginFormComponent } from '../components/login-form.component';
import { RegisterFormComponent } from '../components/register-form.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-auth-container',
  standalone: true,
  imports: [CommonModule, LoginFormComponent, RegisterFormComponent],
  template: `
    <div class="min-h-screen flex bg-mint-white font-sans text-dark-green">
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
          <p class="text-white/80 text-lg mb-10 leading-relaxed">
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

      <!-- Right Side: Auth Form Container -->
      <div class="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        <!-- Abstract elements for mobile -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div class="absolute -top-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-50"></div>
          <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
        </div>
        
        <div class="relative z-10 w-full max-w-md flex flex-col animate-fade-in-up">
          <!-- Logo for mobile only -->
          <div class="mb-10 flex flex-col items-center lg:hidden">
            <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-ai-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/><path d="M12 12l9.9 4.9"/></svg>
            </div>
            <h1 class="text-3xl font-heading font-bold text-dark-green tracking-tight">FLAE Agent</h1>
          </div>

          <!-- The form components will be rendered here -->
          <app-login-form 
            *ngIf="mode === 'login'" 
            [loading]="authStore.isLoading()" 
            [error]="authStore.error()" 
            (submitEmail)="onLoginEmail($event)" 
            (submitGoogle)="onGoogleLogin()">
          </app-login-form>
          
          <app-register-form 
            *ngIf="mode === 'register'" 
            [loading]="authStore.isLoading()" 
            [error]="authStore.error()" 
            (submitEmail)="onRegisterEmail($event)" 
            (submitGoogle)="onGoogleLogin()">
          </app-register-form>
        </div>
      </div>
    </div>
  `
})
export class AuthContainerComponent implements OnInit, OnDestroy {
  mode: 'login' | 'register' = 'login';
  
  authStore = inject(AuthStore);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  private routeSub?: Subscription;

  constructor() {
    /**
     * Watch AuthStore.currentUser — khi AuthInitializerService cập nhật store
     * sau khi đăng nhập thành công, tự động navigate đến dashboard.
     */
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/onboarding';
        this.router.navigateByUrl(returnUrl);
      }
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.data.subscribe(data => {
      if (data['mode']) {
        this.mode = data['mode'];
      }
      this.authStore.clearError();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
    this.authStore.clearError();
  }

  onLoginEmail(payload: { email: string; password: string }): void {
    this.authStore.setLoading(true);
    this.authStore.clearError();
    
    this.authService.signInWithEmail(payload.email, payload.password).subscribe({
      next: () => {
        // AuthInitializerService._watchAuthStateChanges() sẽ detect và xử lý
        // effect() sẽ tự navigate khi store.currentUser được cập nhật
        this.authStore.setLoading(false);
      },
      error: (err) => this.handleAuthError(err)
    });
  }

  onRegisterEmail(payload: { email: string; password: string; fullName?: string }): void {
    this.authStore.setLoading(true);
    this.authStore.clearError();
    
    this.authService.registerWithEmail(payload.email, payload.password).subscribe({
      next: () => {
        this.authStore.setLoading(false);
      },
      error: (err) => this.handleAuthError(err)
    });
  }

  onGoogleLogin(): void {
    this.authStore.setLoading(true);
    this.authStore.clearError();
    
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        this.authStore.setLoading(false);
      },
      error: (err) => this.handleAuthError(err)
    });
  }

  private handleAuthError(err: unknown): void {
    this.authStore.setLoading(false);
    
    let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    const errorCode = (err as { code?: string })?.code ?? '';
    
    if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
      errorMessage = 'Email hoặc mật khẩu không chính xác.';
    } else if (errorCode === 'auth/email-already-in-use') {
      errorMessage = 'Email này đã được sử dụng.';
    } else if (errorCode === 'auth/weak-password') {
      errorMessage = 'Mật khẩu quá yếu.';
    } else if (errorCode === 'auth/popup-closed-by-user') {
      errorMessage = 'Đăng nhập Google đã bị hủy.';
    }
    
    this.authStore.setError(errorMessage);
  }
}
