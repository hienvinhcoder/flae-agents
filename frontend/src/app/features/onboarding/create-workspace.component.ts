import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MockWorkspaceService } from '../../core/services/mock-workspace.service';

@Component({
  selector: 'app-create-workspace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-mint-white p-4">
      <div class="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(6,46,36,0.05)] border border-white/20 p-8 relative overflow-hidden">
        
        <!-- Progress bar -->
        <div class="absolute top-0 left-0 h-1 bg-soft-green w-full">
          <div class="h-full bg-primary transition-all duration-500" [style.width]="step === 1 ? '50%' : '100%'"></div>
        </div>

        <div *ngIf="error()" class="w-full mb-4 mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {{ error() }}
        </div>

        <!-- Step 1 -->
        <div *ngIf="step === 1" class="mt-4 animate-fade-in-up">
          <h2 class="text-2xl font-heading font-bold text-dark-green tracking-tight mb-2">Tạo Workspace mới</h2>
          <p class="text-dark-green/60 mb-8 text-sm">Thiết lập không gian làm việc cho doanh nghiệp của bạn. Có thể thay đổi sau.</p>
          
          <form [formGroup]="form" (ngSubmit)="nextStep()" class="flex flex-col gap-4">
            <div>
              <label class="block text-sm font-medium text-dark-green mb-1">Tên doanh nghiệp</label>
              <input 
                type="text" 
                formControlName="name"
                class="w-full px-4 py-3 rounded-xl border border-soft-green bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-dark-green placeholder-dark-green/30"
                placeholder="Ví dụ: Công ty TNHH ABC"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-dark-green mb-1">Ngành hàng</label>
              <select 
                formControlName="industry"
                class="w-full px-4 py-3 rounded-xl border border-soft-green bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-dark-green appearance-none">
                <option value="" disabled selected>Chọn ngành hàng</option>
                <option value="retail">Bán lẻ / TMĐT</option>
                <option value="service">Dịch vụ / Tư vấn</option>
                <option value="tech">Công nghệ / Phần mềm</option>
                <option value="fnb">Nhà hàng / F&B</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <button 
              type="submit" 
              [disabled]="form.invalid"
              class="w-full mt-6 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 hover:shadow-ai-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              Tiếp tục
            </button>
          </form>
        </div>

        <!-- Step 2 -->
        <div *ngIf="step === 2" class="mt-4 text-center animate-fade-in-up">
          <div class="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 class="text-2xl font-heading font-bold text-dark-green tracking-tight mb-2">Đã sẵn sàng!</h2>
          <p class="text-dark-green/60 mb-8 text-sm">Hệ thống đang khởi tạo môi trường AI cho <span class="font-semibold text-dark-green">{{ form.get('name')?.value }}</span>.</p>
          
          <button 
            (click)="onSubmit()"
            [disabled]="isLoading()"
            class="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 hover:shadow-ai-glow transition-all duration-200 disabled:opacity-50 flex justify-center items-center">
            <span *ngIf="isLoading()" class="mr-2">
               <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </span>
            Vào không gian làm việc
          </button>
          <button 
            *ngIf="!isLoading()"
            (click)="step = 1"
            class="mt-4 text-sm text-dark-green/60 hover:text-dark-green transition-colors">
            Quay lại chỉnh sửa
          </button>
        </div>

      </div>
    </div>
  `
})
export class CreateWorkspaceComponent {
  step = 1;
  private fb = inject(FormBuilder);
  private workspaceService = inject(MockWorkspaceService);
  private router = inject(Router);

  isLoading = this.workspaceService.isLoading;
  error = this.workspaceService.error;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    industry: ['', Validators.required]
  });

  nextStep() {
    if (this.form.valid) {
      this.step = 2;
    }
  }

  async onSubmit() {
    if (this.form.valid) {
      try {
        const { name, industry } = this.form.getRawValue();
        await this.workspaceService.createWorkspace(name, industry);
        // Sau khi thành công, chuyển tới Dashboard (mock alert vì chưa có dashboard route)
        alert('Chuyển hướng tới Dashboard!');
      } catch (e) {
        // Lỗi đã được service handle vào tín hiệu error()
        this.step = 1; // Quay lại bước 1 nếu có lỗi
      }
    }
  }
}
