import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Agent } from '../../models/agent.model';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-surface rounded-2xl border border-border hover:border-border-strong p-6 shadow-soft hover:shadow-soft/50 transition-all duration-300 flex flex-col justify-between h-full group">
      <div>
        <div class="flex items-start justify-between mb-4">
          <!-- Avatar Group -->
          <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm border border-white/10 ' + agent().avatar_color">
            <lucide-icon [name]="agent().avatar_icon" class="w-6 h-6"></lucide-icon>
          </div>
          
          <!-- Actions (chỉ hiển thị khi hover hoặc cho Admin/Owner) -->
          @if (canManage()) {
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button 
                (click)="$event.stopPropagation(); edit.emit(agent())"
                class="p-1.5 hover:bg-white/5 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                title="Chỉnh sửa"
              >
                <lucide-icon name="pencil-line" class="w-4 h-4"></lucide-icon>
              </button>
              <button 
                (click)="$event.stopPropagation(); delete.emit(agent())"
                class="p-1.5 hover:bg-error/10 text-text-muted hover:text-error rounded-lg transition-colors"
                title="Xóa"
              >
                <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
              </button>
            </div>
          }
        </div>

        <!-- Info -->
        <h3 class="text-lg font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">
          {{ agent().name }}
        </h3>
        
        <p class="text-xs text-text-muted mb-3 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-text-disabled"></span>
          {{ agent().model_name || 'gemini-2.5-flash' }}
        </p>

        <p class="text-sm text-text-secondary line-clamp-3 mb-6 min-h-[60px]">
          {{ agent().system_prompt }}
        </p>
      </div>

      <!-- Action Button -->
      <button 
        (click)="chat.emit(agent())"
        class="w-full py-2.5 px-4 border border-ai/30 bg-ai-soft text-ai hover:bg-ai/20 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2"
      >
        <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
        Nhắn tin với Agent
      </button>
    </div>
  `
})
export class AgentCardComponent {
  agent = input.required<Agent>();
  canManage = input<boolean>(false);
  
  edit = output<Agent>();
  delete = output<Agent>();
  chat = output<Agent>();
}
