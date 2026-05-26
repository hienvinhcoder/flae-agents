import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

export interface ActionItemData {
  id: string;
  priority: 'high' | 'medium' | 'low';
  type: string; // 'Cần phản hồi' | 'Cần duyệt' | 'Lỗi' | 'Khác'
  title: string;
  description: string;
  actionText: string;
  draftContent?: string; // Nội dung nháp do AI đề xuất
  recipient?: string;    // Người nhận tin nhắn
}

@Component({
  selector: 'app-action-item',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="p-4 rounded-2xl border transition-all duration-300 flex flex-col"
         [ngClass]="{
           'bg-white border-soft-green/30 hover:border-primary/30 hover:shadow-sm': !isExpanded(),
           'bg-mint-white/80 border-primary/40 shadow-sm ring-1 ring-primary/10': isExpanded(),
           'border-l-4 border-l-red-500': item().priority === 'high' && item().type === 'Lỗi',
           'border-l-4 border-l-orange-500': item().type === 'Cần duyệt',
           'border-l-4 border-l-blue-500': item().priority === 'high' && item().type === 'Cần phản hồi'
         }">
      
      <!-- Clickable Header Area -->
      <div class="cursor-pointer group flex-1" (click)="toggleExpand()">
        <div class="flex items-center justify-between mb-2">
          <!-- Priority and Type Badge -->
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full"
                  [ngClass]="{
                    'bg-red-500': item().priority === 'high' && item().type === 'Lỗi',
                    'bg-orange-500': item().type === 'Cần duyệt',
                    'bg-blue-500': item().type === 'Cần phản hồi'
                  }"></span>
            <span class="text-[11px] font-semibold tracking-wider uppercase"
                  [ngClass]="{
                    'text-red-700': item().priority === 'high' && item().type === 'Lỗi',
                    'text-orange-700': item().type === 'Cần duyệt',
                    'text-blue-700': item().type === 'Cần phản hồi'
                  }">
              {{ item().priority === 'high' ? 'Cao' : (item().priority === 'medium' ? 'Trung bình' : 'Thấp') }} · {{ item().type }}
            </span>
          </div>

          <!-- Expand/Collapse Chevron -->
          @if (item().type === 'Cần duyệt' && item().draftContent) {
            <lucide-icon [name]="isExpanded() ? 'chevron-up' : 'chevron-down'" 
                         class="w-4 h-4 text-dark-green/40 group-hover:text-dark-green transition-colors"></lucide-icon>
          }
        </div>
        
        <div class="font-heading font-semibold text-sm text-dark-green mb-1 group-hover:text-primary transition-colors flex items-center justify-between">
          <span>{{ item().title }}</span>
        </div>
        <p class="text-xs text-dark-green/60 leading-relaxed">{{ item().description }}</p>
      </div>
      
      <!-- Interactive Quick Review Box (Expanded State) -->
      @if (item().type === 'Cần duyệt' && item().draftContent && isExpanded()) {
        <div class="mt-4 pt-3 border-t border-soft-green/50 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-dark-green/50 flex items-center gap-1">
              <lucide-icon name="sparkles" class="w-3.5 h-3.5 text-primary"></lucide-icon>
              DỰ THẢO PHẢN HỒI CỦA AI
            </span>
            @if (item().recipient) {
              <span class="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Gửi tới: {{ item().recipient }}
              </span>
            }
          </div>
          
          <textarea [(ngModel)]="localDraft" 
                    rows="4" 
                    class="w-full text-xs p-3 rounded-xl border border-soft-green/60 bg-white text-dark-green focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans leading-relaxed resize-none"
                    placeholder="Chỉnh sửa nội dung câu trả lời nháp tại đây...">
          </textarea>

          <div class="flex gap-2">
            <button class="flex-1 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    (click)="submitAction($event)">
              <lucide-icon name="send" class="w-3.5 h-3.5"></lucide-icon>
              Duyệt & Gửi ngay
            </button>
            <button class="py-2 px-3 bg-white border border-soft-green text-dark-green/80 rounded-xl text-xs font-medium hover:bg-mint-white transition-all cursor-pointer active:scale-95"
                    (click)="toggleExpand($event)">
              Đóng
            </button>
          </div>
        </div>
      } @else {
        <!-- Normal Buttons (Collapsed State) -->
        <div class="mt-3 flex gap-2">
          @if (item().type === 'Cần duyệt') {
            <button class="px-3.5 py-1.5 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-700 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer flex items-center gap-1 active:scale-95"
                    (click)="handleNormalAction($event)">
              <lucide-icon name="eye" class="w-3.5 h-3.5"></lucide-icon>
              Xem & Duyệt
            </button>
          } @else {
            <button class="text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer py-1 active:translate-x-0.5"
                    [ngClass]="item().priority === 'high' ? 'text-red-600 hover:text-red-700' : 'text-primary hover:text-primary-container'"
                    (click)="handleNormalAction($event)">
              {{ item().actionText }}
              <lucide-icon [name]="item().type === 'Lỗi' ? 'wrench' : 'arrow-right'" class="w-3.5 h-3.5"></lucide-icon>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class ActionItemComponent {
  item = input.required<ActionItemData>();
  
  onAction = output<{ item: ActionItemData, draft?: string }>();
  onSecondaryAction = output<ActionItemData>();

  isExpanded = signal(false);
  localDraft = '';

  toggleExpand(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.item().type === 'Cần duyệt' && this.item().draftContent) {
      if (!this.isExpanded()) {
        this.localDraft = this.item().draftContent || '';
      }
      this.isExpanded.set(!this.isExpanded());
    }
  }

  handleNormalAction(event: Event) {
    event.stopPropagation();
    if (this.item().type === 'Cần duyệt' && this.item().draftContent) {
      this.toggleExpand();
    } else {
      this.onAction.emit({ item: this.item() });
    }
  }

  submitAction(event: Event) {
    event.stopPropagation();
    this.onAction.emit({ item: this.item(), draft: this.localDraft });
    this.isExpanded.set(false);
  }
}
