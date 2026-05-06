import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateManualWorkspacePayload } from '../../../core/models/workspace.model';

@Component({
  selector: 'app-manual-workspace-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6 animate-fade-in-up">
      <div class="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-[0_4px_20px_rgba(6,46,36,0.03)]">
        
        <div class="mb-5">
          <label class="block text-sm font-semibold text-dark-green mb-2 flex items-center">
            Tên doanh nghiệp <span class="text-red-500 ml-1">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-dark-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <input 
              type="text" 
              formControlName="name"
              class="w-full pl-11 pr-4 py-3.5 rounded-xl border border-soft-green/80 bg-white/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-dark-green placeholder-dark-green/30"
              placeholder="Ví dụ: Công ty TNHH ABC"
            />
          </div>
          <div *ngIf="form.get('name')?.touched && form.get('name')?.invalid" class="text-red-500 text-xs mt-2 flex items-center">
            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Vui lòng nhập tên doanh nghiệp (tối thiểu 3 ký tự)
          </div>
        </div>
        
        <div class="mb-5">
          <label class="block text-sm font-semibold text-dark-green mb-2">Ngành hàng</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-dark-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <select 
              formControlName="industry"
              class="w-full pl-11 pr-10 py-3.5 rounded-xl border border-soft-green/80 bg-white/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-dark-green appearance-none">
              <option value="" disabled selected>Chọn ngành hàng</option>
              <option value="retail">Bán lẻ / TMĐT</option>
              <option value="service">Dịch vụ / Tư vấn</option>
              <option value="tech">Công nghệ / Phần mềm</option>
              <option value="fnb">Nhà hàng / F&B</option>
              <option value="other">Khác</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-dark-green/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div class="mb-5">
          <label class="block text-sm font-semibold text-dark-green mb-2">Website <span class="text-dark-green/50 font-normal ml-1">(Tùy chọn)</span></label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-dark-green/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <input 
              type="url" 
              formControlName="website"
              class="w-full pl-11 pr-4 py-3.5 rounded-xl border border-soft-green/80 bg-white/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-dark-green placeholder-dark-green/30"
              placeholder="https://example.com"
            />
          </div>
          <div *ngIf="form.get('website')?.touched && form.get('website')?.invalid" class="text-red-500 text-xs mt-2 flex items-center">
            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            URL không hợp lệ
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-dark-green mb-2">Mô tả <span class="text-dark-green/50 font-normal ml-1">(Tùy chọn)</span></label>
          <textarea 
            formControlName="description"
            rows="3"
            class="w-full px-4 py-3.5 rounded-xl border border-soft-green/80 bg-white/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-dark-green placeholder-dark-green/30 resize-none"
            placeholder="Mô tả ngắn gọn về doanh nghiệp của bạn..."
          ></textarea>
        </div>

      </div>

      <div *ngIf="error" class="text-red-600 text-sm p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl flex items-start">
        <svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{{ error }}</span>
      </div>

      <button 
        type="submit" 
        [disabled]="form.invalid || isLoading"
        class="w-full py-4 px-6 bg-primary text-white font-semibold rounded-2xl hover:bg-[#00A86A] shadow-[0_8px_20px_rgba(0,194,122,0.25)] hover:shadow-[0_8px_25px_rgba(0,194,122,0.4)] transition-all duration-300 disabled:opacity-60 disabled:hover:bg-primary disabled:hover:shadow-[0_8px_20px_rgba(0,194,122,0.25)] flex justify-center items-center group relative overflow-hidden">
        
        <!-- Shine effect -->
        <div class="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
        
        <span *ngIf="isLoading" class="mr-3">
           <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </span>
        <span class="relative z-10 text-lg">Khởi tạo Workspace</span>
        <svg *ngIf="!isLoading" class="w-5 h-5 ml-2 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
    </form>
  `
})
export class ManualWorkspaceFormComponent {
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Output() submitForm = new EventEmitter<CreateManualWorkspacePayload>();

  private fb = inject(FormBuilder);
  
  // Pattern matching URL
  private urlPattern = '^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    industry: [''],
    description: ['', Validators.maxLength(500)],
    website: ['', Validators.pattern(this.urlPattern)]
  });

  onSubmit() {
    if (this.form.valid) {
      this.submitForm.emit(this.form.getRawValue());
    } else {
      this.form.markAllAsTouched();
    }
  }
}
