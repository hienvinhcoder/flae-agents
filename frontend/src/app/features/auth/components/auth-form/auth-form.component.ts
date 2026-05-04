import { Component, input, output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full p-8 sm:p-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(6,46,36,0.04)] border border-white/40">
      <div class="mb-8">
        <h2 class="text-3xl font-heading text-dark-green tracking-tight font-bold">Chào mừng trở lại</h2>
        <p class="text-dark-green/60 mt-2 font-sans">Đăng nhập để tiếp tục với không gian làm việc của bạn.</p>
      </div>

      <!-- Google Login Button -->
      <button 
        (click)="googleLogin.emit()"
        [disabled]="isLoading()"
        class="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-soft-green rounded-xl hover:bg-mint-white hover:border-primary/30 transition-all duration-200 text-dark-green font-semibold mb-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Tiếp tục với Google
      </button>

      <div class="relative flex items-center mb-6">
        <div class="flex-grow border-t border-soft-green/60"></div>
        <span class="flex-shrink-0 mx-4 text-dark-green/50 text-sm font-medium">hoặc đăng nhập bằng Email</span>
        <div class="flex-grow border-t border-soft-green/60"></div>
      </div>

      <!-- Email Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-dark-green">Email công việc</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-green/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <input 
              type="email" 
              formControlName="email"
              class="w-full pl-11 pr-4 py-3.5 rounded-xl border border-soft-green bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-dark-green placeholder-dark-green/30 shadow-sm"
              placeholder="nam@congty.com"
            />
          </div>
        </div>
        
        <div class="space-y-1.5">
          <div class="flex justify-between items-center">
            <label class="block text-sm font-medium text-dark-green">Mật khẩu</label>
            <a href="#" class="text-sm text-primary font-medium hover:text-dark-green hover:underline transition-colors">Quên mật khẩu?</a>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-green/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input 
              type="password" 
              formControlName="password"
              class="w-full pl-11 pr-4 py-3.5 rounded-xl border border-soft-green bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-dark-green placeholder-dark-green/30 shadow-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit" 
          [disabled]="form.invalid || isLoading()"
          class="w-full mt-4 py-3.5 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(0,194,122,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex justify-center items-center cursor-pointer">
          <span *ngIf="isLoading()" class="mr-2">
             <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
          </span>
          Đăng nhập vào hệ thống
        </button>
      </form>
      
      <p class="text-center mt-8 text-sm text-dark-green/70">
        Chưa có tài khoản? <a href="#" class="text-primary font-semibold hover:underline">Đăng ký trải nghiệm</a>
      </p>
    </div>
  `
})
export class AuthFormComponent {
  // Using input() signal for properties
  isLoading = input<boolean>(false);
  
  // Outputs
  emailLogin = output<{email: string, password: string}>();
  googleLogin = output<void>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.form.valid) {
      this.emailLogin.emit(this.form.getRawValue());
    }
  }
}
