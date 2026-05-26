import { Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateManualWorkspacePayload } from '../../../core/models/workspace.model';

@Component({
  selector: 'app-manual-creation-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="w-full max-w-md mx-auto font-heading">
      <div class="mb-8">
        <button (click)="goBack.emit()" class="text-[14px] text-secondary hover:text-gray-900 flex items-center gap-1 mb-6 transition-colors cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Quay lại
        </button>
        <h2 class="text-[28px] font-bold text-gray-900 tracking-tight">Tạo cửa hàng thủ công</h2>
        <p class="text-secondary mt-2">Vui lòng nhập thông tin cơ bản</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="block text-[14px] font-semibold text-gray-900">Tên cửa hàng <span class="text-red-500">*</span></label>
          <input 
            type="text" 
            formControlName="name"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-[3px] focus:ring-gray-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
            placeholder="Ví dụ: Tạp hoá Cô Ba"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span class="text-red-500 text-xs mt-1 block font-medium">Tên cửa hàng là bắt buộc</span>
          }
        </div>

        <div class="flex flex-col gap-2">
          <label class="block text-[14px] font-semibold text-gray-900">Ngành hàng</label>
          <input 
            type="text" 
            formControlName="industry"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-[3px] focus:ring-gray-900/10 outline-none transition-all text-gray-900 placeholder:text-gray-400"
            placeholder="Ví dụ: Bán lẻ, Thời trang, Ẩm thực..."
          />
        </div>

        <button 
          type="submit" 
          [disabled]="form.invalid || isSubmitting()"
          class="mt-2 w-full bg-cta hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:-translate-y-[1px] flex justify-center items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
        >
          @if (isSubmitting()) {
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Đang xử lý...
          } @else {
            Hoàn tất tạo
          }
        </button>
      </form>
    </div>
  `
})
export class ManualCreationFormComponent {
  isSubmitting = input<boolean>(false);
  submitForm = output<CreateManualWorkspacePayload>();
  goBack = output<void>();

  form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    industry: ['']
  });

  onSubmit() {
    if (this.form.valid) {
      this.submitForm.emit(this.form.getRawValue());
    }
  }
}
