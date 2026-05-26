import { Component, input } from '@angular/core';

@Component({
  selector: 'app-oauth-redirect-loading',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center w-full max-w-md mx-auto py-12 text-center font-heading">
      <div class="relative w-20 h-20 mb-8">
        <div class="absolute inset-0 rounded-full border-4 border-gray-100"></div>
        <div class="absolute inset-0 rounded-full border-4 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
      <h2 class="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">Đang chuyển hướng</h2>
      <p class="text-secondary">
        Hệ thống đang kết nối tới <span class="font-semibold text-gray-900">{{ providerName() }}</span>.
        <br />Vui lòng không đóng trình duyệt...
      </p>
    </div>
  `
})
export class OauthRedirectLoadingComponent {
  providerName = input.required<string>();
}
