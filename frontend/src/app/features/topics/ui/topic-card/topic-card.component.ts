import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { Topic } from '../../../../core/models/topic.model';

@Component({
  selector: 'app-topic-card',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, TranslateModule],
  template: `
    <div
      [routerLink]="['/dashboard/topics', topic().topic_id]"
      class="bg-surface border border-border hover:border-primary/40 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-md flex flex-col justify-between h-[200px] select-none group relative overflow-hidden">
      
      <!-- Hover overlay effect -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div class="space-y-3 relative z-10">
        <!-- Header: Type & Status Badges -->
        <div class="flex items-center justify-between gap-2 shrink-0">
          <span
            class="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-primary-soft text-primary border border-primary/20">
            {{ topic().type }}
          </span>
          
          <!-- Status Badge -->
          @if (topic().status === 'active') {
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {{ 'TOPICS.STATUS_ACTIVE' | translate }}
            </span>
          } @else if (topic().status === 'needs_review') {
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
              {{ 'TOPICS.STATUS_NEEDS_REVIEW' | translate }}
            </span>
          } @else {
            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-text-muted/10 text-text-muted border border-border">
              {{ 'TOPICS.STATUS_ARCHIVED' | translate }}
            </span>
          }
        </div>

        <!-- Topic Name -->
        <h3 class="text-base font-bold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-1">
          {{ topic().name }}
        </h3>

        <!-- Topic Summary -->
        <p class="text-xs text-text-secondary line-clamp-3 leading-relaxed">
          {{ topic().summary || ('TOPICS.NO_TOPICS' | translate) }}
        </p>
      </div>

      <!-- Footer Info -->
      <div class="flex items-center justify-between pt-3 border-t border-border/60 shrink-0 text-text-muted text-[11px] relative z-10">
        <!-- Evidence Count -->
        <span class="flex items-center gap-1">
          <lucide-icon name="database" class="w-3.5 h-3.5"></lucide-icon>
          <strong>{{ topic().evidence_count || 0 }}</strong> {{ 'TOPICS.RELEVANCE' | translate }}
        </span>
        
        <!-- Confidence Score -->
        <span class="flex items-center gap-1">
          <lucide-icon name="sparkles" class="w-3.5 h-3.5 text-primary"></lucide-icon>
          {{ 'TOPICS.CONFIDENCE_SCORE' | translate }}: <strong>{{ (topic().confidence * 100) | number:'1.0-0' }}%</strong>
        </span>
      </div>
    </div>
  `
})
export class TopicCardComponent {
  topic = input.required<Topic>();
}
