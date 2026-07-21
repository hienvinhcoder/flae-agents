import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-surface/80 backdrop-blur-xl rounded-2xl shadow-soft p-8 w-full border border-border/60">
      <div class="mb-8">
        <h2 class="text-2xl font-heading font-bold text-text-primary mb-2">Đăng nhập</h2>
        <p class="text-text-muted font-sans text-sm">Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1.5" for="email">Email</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <input 
              id="email" 
              type="email" 
              formControlName="email"
              placeholder="name@company.com" 
              class="w-full pl-10 pr-4 py-2.5 bg-app/50 border rounded-xl text-text-primary placeholder:text-text-disabled outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:text-text-disabled"
              [ngClass]="{'border-error/50 focus:border-error focus:ring-error/20': isFieldInvalid('email'), 'border-border focus:border-primary': !isFieldInvalid('email')}"
            />
          </div>
          <p *ngIf="isFieldInvalid('email')" class="mt-1.5 text-xs text-error animate-fade-in-up flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span>Email không hợp lệ</span>
          </p>
        </div>

        <!-- Password -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-sm font-medium text-text-secondary" for="password">Mật khẩu</label>
            <a href="#" class="text-xs text-primary font-medium hover:text-primary-hover transition-colors cursor-pointer">Quên mật khẩu?</a>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input 
              id="password" 
              [type]="showPassword ? 'text' : 'password'" 
              formControlName="password"
              placeholder="••••••••" 
              class="w-full pl-10 pr-10 py-2.5 bg-app/50 border rounded-xl text-text-primary placeholder:text-text-disabled outline-none transition focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:text-text-disabled"
              [ngClass]="{'border-error/50 focus:border-error focus:ring-error/20': isFieldInvalid('password'), 'border-border focus:border-primary': !isFieldInvalid('password')}"
            />
            <button 
              type="button" 
              (click)="togglePassword()"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            </button>
          </div>
          <p *ngIf="isFieldInvalid('password')" class="mt-1.5 text-xs text-error animate-fade-in-up flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <span>Mật khẩu tối thiểu 6 ký tự</span>
          </p>
        </div>

        <!-- Error Alert -->
        <div *ngIf="error" class="p-3 bg-error-soft border border-error-border text-error rounded-lg text-sm flex items-start gap-2 animate-fade-in-up">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{{ error }}</span>
        </div>

        <!-- Submit Button (btn-primary) -->
        <button 
          type="submit" 
          [disabled]="loginForm.invalid || loading"
          class="btn-primary w-full py-3 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div *ngIf="loading" class="spinner"></div>
          <span>{{ loading ? 'Đang xử lý...' : 'Đăng nhập' }}</span>
        </button>
      </form>

      <div class="mt-6 mb-6 relative flex items-center">
        <div class="grow border-t border-border"></div>
        <span class="shrink-0 mx-4 text-text-muted/60 text-sm">Hoặc tiếp tục với</span>
        <div class="grow border-t border-border"></div>
      </div>

      <!-- Google Button (btn-secondary style custom) -->
      <button 
        type="button" 
        (click)="onGoogleClick()"
        [disabled]="loading"
        class="w-full py-2.5 px-4 bg-elevated/60 border border-border rounded-lg text-text-primary font-medium hover:border-border-strong hover:bg-subtle transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span>Google</span>
      </button>

      <p class="mt-8 text-center text-sm text-text-muted/80">
        Chưa có tài khoản? 
        <a routerLink="/auth/register" class="text-primary font-medium hover:text-primary-hover transition-colors cursor-pointer ml-1">Đăng ký ngay</a>
      </p>
    </div>
  `
})
export class LoginFormComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() submitEmail = new EventEmitter<any>();
  @Output() submitGoogle = new EventEmitter<void>();

  loginForm: FormGroup;
  showPassword = false;

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.submitEmail.emit(this.loginForm.value);
    } else {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  onGoogleClick(): void {
    this.submitGoogle.emit();
  }
}
