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
}

@Component({
  selector: 'app-briefing-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-soft relative overflow-hidden"
         [ngClass]="{
           'border border-soft-green/50': item().agentType !== 'system',
           'border border-red-100 bg-gradient-to-br from-white to-red-50/30': item().agentType === 'system'
         }">
      
      <!-- Color Indicator for Chat Agent -->
      @if (item().agentType === 'chat') {
        <div class="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
      }

      <!-- Header -->
      <div class="flex items-center gap-3 mb-4 border-b pb-3"
           [ngClass]="item().agentType === 'system' ? 'border-red-100' : 'border-soft-green/30'">
        
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
             [ngClass]="{
               'bg-blue-50 text-blue-600': item().agentType === 'analyst',
               'bg-orange-50 text-orange-500': item().agentType === 'chat',
               'bg-indigo-50 text-indigo-600': item().agentType === 'voice',
               'bg-red-100 text-red-600': item().agentType === 'system'
             }">
          <lucide-icon [name]="getAgentIcon(item().agentType)" class="w-4 h-4"></lucide-icon>
        </div>
        
        <div>
          <div class="font-medium text-sm" [ngClass]="item().agentType === 'system' ? 'text-red-800' : 'text-dark-green'">
            {{ item().agentName }}
          </div>
          <div class="text-xs" [ngClass]="item().agentType === 'system' ? 'text-red-600/70' : 'text-dark-green/50'">
            {{ item().time }}
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <h4 class="text-lg font-heading font-semibold mb-2"
          [ngClass]="item().agentType === 'system' ? 'text-red-900' : 'text-dark-green'">
        {{ item().title }}
      </h4>
      <p class="text-sm leading-relaxed mb-4"
         [ngClass]="item().agentType === 'system' ? 'text-red-800/80' : 'text-dark-green/80'">
        {{ item().content }}
      </p>
      
      <!-- Meta Data (if any) -->
      @if (item().metaData) {
        <div class="flex items-center gap-2 mb-5">
          <span class="px-2.5 py-1 bg-mint-white border border-soft-green rounded text-xs font-medium text-dark-green/70">
            {{ item().metaData }}
          </span>
        </div>
      }

      <!-- Actions -->
      <div class="flex gap-3" [class.mt-5]="!item().metaData">
        <button [ngClass]="{
                  'bg-dark-green text-white hover:bg-dark-green/90': item().agentType === 'chat',
                  'bg-red-600 text-white hover:bg-red-700': item().agentType === 'system',
                  'bg-white border border-soft-green hover:bg-mint-white text-dark-green': item().agentType !== 'chat' && item().agentType !== 'system'
                }"
                class="px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                (click)="onPrimaryAction.emit(item())">
          {{ item().primaryAction }}
        </button>
        
        @if (item().secondaryAction) {
          <button class="bg-white border border-soft-green hover:bg-mint-white text-dark-green px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
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
}
