import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Citation } from '../../models/agent.model';

@Component({
  selector: 'app-citation-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-2.5 max-w-full">
      @for (c of citations(); track $index) {
        <div class="bg-app border border-border hover:border-border-strong rounded-xl p-3.5 transition-all duration-200">
          <div class="flex items-center gap-2 mb-1.5">
            <lucide-icon name="file-text" class="w-4 h-4 text-text-muted"></lucide-icon>
            <span class="text-xs font-bold text-text-primary truncate max-w-[90%]">
              {{ c.source_document }}
            </span>
            @if (c.score) {
              <span class="text-[10px] font-medium border border-success/30 bg-success/10 text-success px-1.5 py-0.5 rounded-full ml-auto">
                {{ (c.score * 100).toFixed(0) }}% khớp
              </span>
            }
          </div>
          <p class="text-xs text-text-secondary italic leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-300">
            "{{ c.content }}"
          </p>
        </div>
      }
    </div>
  `
})
export class CitationListComponent {
  citations = input.required<Citation[]>();
}
