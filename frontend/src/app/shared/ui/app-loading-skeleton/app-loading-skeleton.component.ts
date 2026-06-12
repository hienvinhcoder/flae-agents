import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-app">
      <div class="flex flex-col items-center gap-6 animate-fade-in-up">
        <!-- Logo -->
        <div class="w-16 h-16 bg-surface border border-primary-border rounded-2xl flex items-center justify-center shadow-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-primary">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 12 2.1 7.1"/>
            <path d="M12 12l9.9 4.9"/>
          </svg>
        </div>

        <!-- Loading spinner + text -->
        <div class="flex items-center gap-3">
          <div class="spinner"></div>
          <span class="text-text-muted text-sm font-medium">Đang khởi tạo...</span>
        </div>
      </div>
    </div>
  `
})
export class AppLoadingSkeletonComponent {}
