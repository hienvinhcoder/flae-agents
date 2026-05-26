import { Component, input } from '@angular/core';

@Component({
  selector: 'app-sync-status-banner',
  standalone: true,
  template: `
    @if (isSyncing()) {
      <div class="mx-4 md:mx-6 lg:mx-8 mt-4 px-4 py-3 rounded-2xl bg-primary/8 backdrop-blur-md border border-primary/15 text-primary flex items-center justify-between shadow-soft animate-pulse z-30">
        <div class="flex items-center gap-3">
          <svg class="animate-spin h-5 w-5 text-primary-container" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm font-semibold tracking-tight text-primary">Hệ thống đang tự động đồng bộ hóa dữ liệu ngầm...</span>
        </div>
        <span class="text-xs text-primary/70 hidden sm:inline-block font-sans font-medium">Đang chạy các tác vụ nền</span>
      </div>
    }
  `
})
export class SyncStatusBannerComponent {
  isSyncing = input.required<boolean>();
}
