import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DocumentStatus } from '../../../../../core/models/knowledge-base.model';

interface Step {
  id: number;
  label: string;
  desc: string;
}

@Component({
  selector: 'app-ingestion-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-4">
      @for (step of steps; track step.id; let isLast = $last) {
        <div class="flex items-start relative">
          <!-- Connector line -->
          @if (!isLast) {
            <div 
              class="absolute left-3 top-6 w-[2px] h-[calc(100%)] bg-border"
              [class.bg-graph]="isStepCompleted(step.id)"
            ></div>
          }
          
          <!-- Step Icon Indicator -->
          <div 
            class="w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 z-10 text-xs font-semibold"
            [ngClass]="getStepIndicatorClasses(step.id)"
          >
            @if (isStepCompleted(step.id)) {
              <lucide-icon name="check" class="w-3.5 h-3.5 text-app"></lucide-icon>
            } @else if (isStepFailed(step.id)) {
              <lucide-icon name="x" class="w-3.5 h-3.5 text-app"></lucide-icon>
            } @else if (isStepActive(step.id)) {
              @if (status() === 'processing') {
                <div class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
              } @else {
                <span>{{ step.id }}</span>
              }
            } @else {
              <span>{{ step.id }}</span>
            }
          </div>

          <!-- Step Details -->
          <div class="ml-3">
            <h4 
              class="text-xs font-semibold transition-colors duration-200"
              [ngClass]="getStepTextClasses(step.id)"
            >
              {{ step.label }}
            </h4>
            <p class="text-[11px] text-text-muted mt-0.5">{{ step.desc }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `
  ]
})
export class IngestionProgressComponent {
  status = input.required<DocumentStatus>();

  readonly steps: Step[] = [
    { id: 1, label: 'Nạp tài liệu', desc: 'Đã tiếp nhận file và lập lịch xử lý' },
    { id: 2, label: 'Trích xuất văn bản', desc: 'Đang chuyển đổi định dạng sang Markdown' },
    { id: 3, label: 'Phân khối văn bản', desc: 'Chia nhỏ nội dung thành các chunk văn bản' },
    { id: 4, label: 'Xây dựng Graph RAG', desc: 'Trích xuất thực thể, mối quan hệ và embedding' },
    { id: 5, label: 'Sẵn sàng sử dụng', desc: 'Tài liệu đã được tích hợp vào cơ sở tri thức' }
  ];

  isStepCompleted(stepId: number): boolean {
    const s = this.status();
    if (s === 'completed') return true;
    if (s === 'failed') return stepId < 4; // giả sử lỗi ở bước 4
    if (s === 'processing') return stepId < 3; // giả sử đang làm bước 3/4
    if (s === 'pending') return false;
    return false;
  }

  isStepActive(stepId: number): boolean {
    const s = this.status();
    if (s === 'pending') return stepId === 1;
    if (s === 'processing') return stepId === 3 || stepId === 4;
    if (s === 'failed') return stepId === 4;
    return false;
  }

  isStepFailed(stepId: number): boolean {
    return this.status() === 'failed' && stepId === 4;
  }

  getStepIndicatorClasses(stepId: number): Record<string, boolean> {
    const isCompleted = this.isStepCompleted(stepId);
    const isActive = this.isStepActive(stepId);
    const isFailed = this.isStepFailed(stepId);

    return {
      'bg-graph text-app border border-graph shadow-[0_0_10px_rgba(74,222,128,0.2)]': isCompleted,
      'bg-primary-soft text-primary border border-primary animate-pulse': isActive && !isFailed && this.status() === 'processing',
      'bg-warning-soft text-warning border border-warning': isActive && !isFailed && this.status() === 'pending',
      'bg-error text-app border border-error shadow-[0_0_10px_rgba(248,113,113,0.2)]': isFailed,
      'bg-subtle text-text-disabled border border-border': !isCompleted && !isActive && !isFailed
    };
  }

  getStepTextClasses(stepId: number): Record<string, boolean> {
    const isCompleted = this.isStepCompleted(stepId);
    const isActive = this.isStepActive(stepId);
    const isFailed = this.isStepFailed(stepId);

    return {
      'text-text-primary font-semibold': isCompleted || isActive,
      'text-error font-semibold': isFailed,
      'text-text-disabled': !isCompleted && !isActive && !isFailed
    };
  }
}
