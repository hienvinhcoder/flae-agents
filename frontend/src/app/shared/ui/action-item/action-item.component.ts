import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface ActionItemData {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  actionText: string;
}

@Component({
  selector: 'app-action-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="p-4 rounded-xl hover:bg-mint-white border border-transparent hover:border-soft-green/50 transition-all cursor-pointer group">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-2 h-2 rounded-full"
              [ngClass]="{
                'bg-red-500': item().priority === 'high' && item().type !== 'Cần duyệt',
                'bg-orange-500': item().type === 'Cần duyệt',
                'bg-blue-500': item().priority === 'medium'
              }"></span>
        <span class="text-xs font-medium"
              [ngClass]="{
                'text-red-600': item().priority === 'high' && item().type !== 'Cần duyệt',
                'text-orange-600': item().type === 'Cần duyệt',
                'text-blue-600': item().priority === 'medium'
              }">
          {{ item().priority === 'high' ? 'Cao' : (item().priority === 'medium' ? 'Trung bình' : 'Thấp') }} · {{ item().type }}
        </span>
      </div>
      
      <div class="font-medium text-sm text-dark-green mb-1 group-hover:text-primary transition-colors">{{ item().title }}</div>
      <p class="text-xs text-dark-green/60 mb-3">{{ item().description }}</p>
      
      @if (item().type === 'Cần duyệt') {
        <div class="flex gap-2">
          <button class="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  (click)="onAction.emit(item())">
            {{ item().actionText }}
          </button>
          <button class="px-3 py-1.5 bg-white border border-soft-green text-dark-green rounded-lg text-xs font-medium hover:bg-mint-white transition-colors cursor-pointer"
                  (click)="onSecondaryAction.emit(item())">
            Sửa
          </button>
        </div>
      } @else {
        <button class="text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                [ngClass]="item().priority === 'medium' ? 'text-blue-600 hover:text-blue-700' : 'text-primary hover:text-primary/80'"
                (click)="onAction.emit(item())">
          {{ item().actionText }}
          <lucide-icon [name]="item().priority === 'medium' ? 'external-link' : 'arrow-right'" class="w-3 h-3"></lucide-icon>
        </button>
      }
    </div>
  `
})
export class ActionItemComponent {
  item = input.required<ActionItemData>();
  
  onAction = output<ActionItemData>();
  onSecondaryAction = output<ActionItemData>();
}
