import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface SummaryCardData {
  title: string;
  value: string;
  meta: string;
  icon: string;
  type: 'revenue' | 'chat' | 'approval' | 'alert';
}

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-soft-green/50 shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
      <div class="text-sm font-medium text-dark-green/60 mb-2 group-hover:text-dark-green transition-colors">{{ card().title }}</div>
      <div class="text-2xl font-heading font-semibold text-dark-green">{{ card().value }}</div>
      <div class="mt-2 text-sm font-medium flex items-center gap-1"
           [ngClass]="{
             'text-primary': card().type === 'revenue',
             'text-orange-500': card().type === 'chat',
             'text-blue-500': card().type === 'approval',
             'text-red-500': card().type === 'alert'
           }">
        <lucide-icon [name]="card().icon" class="w-4 h-4"></lucide-icon>
        {{ card().meta }}
      </div>
    </div>
  `
})
export class SummaryCardComponent {
  card = input.required<SummaryCardData>();
}
