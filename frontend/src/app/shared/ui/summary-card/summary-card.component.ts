import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface SummaryCardData {
  title: string;
  value: string;
  meta: string;
  icon: string;
  type: 'revenue' | 'chat' | 'approval' | 'alert';
  progress?: number;     // Ví dụ: 65 đại diện cho 65% mục tiêu ngày
  subValue?: string;     // Chỉ số phụ, ví dụ: "12 khách chờ"
}

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-soft-green/50 shadow-soft hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full min-h-[140px]">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-dark-green/50 group-hover:text-dark-green/80 transition-colors">{{ card().title }}</span>
          <div class="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300"
               [ngClass]="{
                 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white': card().type === 'revenue',
                 'bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white': card().type === 'chat',
                 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white': card().type === 'approval',
                 'bg-red-500/10 text-red-600 group-hover:bg-red-500 group-hover:text-white': card().type === 'alert'
               }">
            <lucide-icon [name]="card().icon" class="w-4 h-4"></lucide-icon>
          </div>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-heading font-bold text-dark-green">{{ card().value }}</span>
          @if (card().subValue) {
            <span class="text-xs font-medium text-dark-green/60">{{ card().subValue }}</span>
          }
        </div>
      </div>

      <div class="mt-4">
        @if (card().progress !== undefined) {
          <!-- Tiến trình (cho doanh thu) -->
          <div class="space-y-1.5">
            <div class="flex justify-between text-[11px] font-medium text-dark-green/60">
              <span>Đạt mục tiêu ngày</span>
              <span class="font-bold text-primary">{{ card().progress }}%</span>
            </div>
            <div class="w-full h-1.5 bg-soft-green/30 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all duration-500" [style.width.%]="card().progress"></div>
            </div>
          </div>
        } @else {
          <!-- Meta tag cho các chỉ số khác -->
          <div class="text-[11px] font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-lg w-max"
               [ngClass]="{
                 'bg-primary/10 text-primary': card().type === 'revenue',
                 'bg-orange-500/10 text-orange-700': card().type === 'chat',
                 'bg-blue-500/10 text-blue-700': card().type === 'approval',
                 'bg-red-500/10 text-red-700': card().type === 'alert'
               }">
            <span class="w-1.5 h-1.5 rounded-full" 
                  [ngClass]="{
                    'bg-primary': card().type === 'revenue',
                    'bg-orange-500': card().type === 'chat',
                    'bg-blue-500': card().type === 'approval',
                    'bg-red-500': card().type === 'alert'
                  }"></span>
            {{ card().meta }}
          </div>
        }
      </div>
    </div>
  `
})
export class SummaryCardComponent {
  card = input.required<SummaryCardData>();
}
