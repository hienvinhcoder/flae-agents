import { Component, output } from '@angular/core';
import { OptionCardComponent } from '../../../shared/ui/option-card.component';

@Component({
  selector: 'app-onboarding-method-selector',
  standalone: true,
  imports: [OptionCardComponent],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-md mx-auto font-heading">
      <div class="text-center mb-6">
        <h2 class="text-[28px] font-bold text-gray-900 tracking-tight">Thiết lập Workspace</h2>
        <p class="text-secondary mt-2">Kết nối gian hàng có sẵn hoặc tạo thủ công</p>
      </div>

      <div class="flex flex-col gap-4">
        <app-option-card
          title="Tạo thủ công"
          description="Bắt đầu từ đầu với cửa hàng mới"
          (onClick)="selectMethod.emit('manual')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        </app-option-card>

        <app-option-card
          title="Kết nối Haravan"
          description="Đồng bộ sản phẩm, đơn hàng tự động"
          (onClick)="selectMethod.emit('haravan')"
        >
          <span class="font-bold text-lg">H</span>
        </app-option-card>

        <app-option-card
          title="Kết nối KiotViet"
          description="Đồng bộ tồn kho, bán hàng tự động"
          (onClick)="selectMethod.emit('kiotviet')"
        >
          <span class="font-bold text-lg">K</span>
        </app-option-card>
      </div>
    </div>
  `
})
export class OnboardingMethodSelectorComponent {
  selectMethod = output<'manual' | 'haravan' | 'kiotviet'>();
}
