import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface BriefingItemData {
  id: string;
  agentName: string;
  agentType: 'analyst' | 'chat' | 'voice' | 'system';
  time: string;
  title: string;
  content: string;
  metaData?: string;
  primaryAction: string;
  secondaryAction?: string;
  priority?: 'high' | 'medium' | 'low';
  impact?: string;      // Tác động kinh doanh (e.g. "Doanh số giảm 18%", "Khách chờ 42 phút")
}

@Component({
  selector: 'app-briefing-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft hover:shadow-md transition-all duration-300 relative overflow-hidden border"
         [ngClass]="{
           'border-soft-green/60': item().agentType !== 'system' && item().priority !== 'high',
           'border-red-200 bg-gradient-to-br from-white to-red-50/20': item().agentType === 'system' || item().priority === 'high',
           'border-orange-200 bg-gradient-to-br from-white to-orange-50/20': item().agentType === 'chat' && item().priority === 'high'
         }">
      
      <!-- Color Indicator on left border -->
      <div class="absolute top-0 left-0 w-1.5 h-full transition-colors"
           [ngClass]="{
             'bg-primary': item().agentType === 'analyst',
             'bg-orange-500': item().agentType === 'chat',
             'bg-blue-500': item().agentType === 'voice',
             'bg-red-500': item().agentType === 'system'
           }"></div>

      <!-- Card Top Header -->
      <div class="flex items-center justify-between mb-4 border-b pb-3"
           [ngClass]="item().agentType === 'system' || item().priority === 'high' ? 'border-red-100' : 'border-soft-green/30'">
        
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
               [ngClass]="{
                 'bg-primary/10 text-primary': item().agentType === 'analyst',
                 'bg-orange-500/10 text-orange-600': item().agentType === 'chat',
                 'bg-blue-500/10 text-blue-600': item().agentType === 'voice',
                 'bg-red-500/10 text-red-600': item().agentType === 'system'
               }">
            <lucide-icon [name]="getAgentIcon(item().agentType)" class="w-4.5 h-4.5"></lucide-icon>
          </div>
          
          <div>
            <div class="font-heading font-semibold text-sm text-dark-green flex items-center gap-2">
              {{ item().agentName }}
              @if (item().priority === 'high') {
                <span class="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Khẩn cấp</span>
              }
            </div>
            <div class="text-xs text-dark-green/50 flex items-center gap-1.5 mt-0.5">
              <lucide-icon name="clock" class="w-3 h-3"></lucide-icon>
              <span>{{ item().time }}</span>
            </div>
          </div>
        </div>

        <!-- Right Side Badge (Agent Type Label) -->
        <span class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-mint-white border border-soft-green text-dark-green/60">
          {{ getAgentTypeName(item().agentType) }}
        </span>
      </div>
      
      <!-- Content Area -->
      <h4 class="text-lg font-heading font-bold mb-2 text-dark-green leading-snug group-hover:text-primary transition-colors">
        {{ item().title }}
      </h4>
      <p class="text-sm text-dark-green/75 leading-relaxed mb-4">
        {{ item().content }}
      </p>
      
      <!-- Business Impact / Meta Data (If Any) -->
      @if (item().impact || item().metaData) {
        <div class="flex flex-wrap items-center gap-2 mb-5">
          @if (item().impact) {
            <span class="px-3 py-1.5 bg-red-500/10 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-1">
              <lucide-icon name="trending-down" class="w-3.5 h-3.5"></lucide-icon>
              {{ item().impact }}
            </span>
          }
          @if (item().metaData) {
            <span class="px-3 py-1.5 bg-soft-green/20 border border-soft-green rounded-xl text-xs font-medium text-dark-green/75 flex items-center gap-1">
              <lucide-icon name="database" class="w-3.5 h-3.5"></lucide-icon>
              {{ item().metaData }}
            </span>
          }
        </div>
      }

      <!-- Actions Buttons -->
      <div class="flex flex-wrap gap-2.5" [class.mt-5]="!item().impact && !item().metaData">
        <button [ngClass]="{
                  'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20': item().agentType !== 'system' && item().priority !== 'high',
                  'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20': item().agentType === 'system' || item().priority === 'high'
                }"
                class="px-4.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95"
                (click)="onPrimaryAction.emit(item())">
          {{ item().primaryAction }}
          <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
        </button>
        
        @if (item().secondaryAction) {
          <button class="bg-white border border-soft-green hover:bg-mint-white text-dark-green px-4.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95"
                  (click)="onSecondaryAction.emit(item())">
            {{ item().secondaryAction }}
          </button>
        }
      </div>
    </div>
  `
})
export class BriefingItemComponent {
  item = input.required<BriefingItemData>();
  
  onPrimaryAction = output<BriefingItemData>();
  onSecondaryAction = output<BriefingItemData>();

  getAgentIcon(type: string): string {
    switch (type) {
      case 'analyst': return 'bar-chart-2';
      case 'chat': return 'message-square';
      case 'voice': return 'phone';
      case 'system': return 'alert-triangle';
      default: return 'bell';
    }
  }

  getAgentTypeName(type: string): string {
    switch (type) {
      case 'analyst': return 'Phân tích';
      case 'chat': return 'Tư vấn';
      case 'voice': return 'Cuộc gọi';
      case 'system': return 'Hệ thống';
      default: return 'Trợ lý';
    }
  }
}
