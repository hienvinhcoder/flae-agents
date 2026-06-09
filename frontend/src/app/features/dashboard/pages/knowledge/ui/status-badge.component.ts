import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeComponent } from '../../../../../shared/ui/badge.component';
import { DocumentStatus } from '../../../../../core/models/knowledge-base.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, BadgeComponent],
  template: `
    <app-badge [variant]="badgeVariant()">
      <lucide-icon 
        [name]="badgeIcon()" 
        class="w-3.5 h-3.5 mr-1" 
        [class.animate-spin]="status() === 'processing'"
        [class.text-yellow-400]="status() === 'pending'"
        [class.text-orange-400]="status() === 'processing'"
        [class.text-green-400]="status() === 'completed'"
        [class.text-red-400]="status() === 'failed'"
      ></lucide-icon>
      <span>{{ badgeLabel() | translate }}</span>
    </app-badge>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `
  ]
})
export class StatusBadgeComponent {
  status = input.required<DocumentStatus>();

  badgeVariant = computed<'warning' | 'primary' | 'graph' | 'error' | 'default'>(() => {
    switch (this.status()) {
      case 'pending':
        return 'warning';
      case 'processing':
        return 'primary';
      case 'completed':
        return 'graph';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  });

  badgeIcon = computed<string>(() => {
    switch (this.status()) {
      case 'pending':
        return 'clock';
      case 'processing':
        return 'loader-2';
      case 'completed':
        return 'check-circle-2';
      case 'failed':
        return 'circle-alert';
      default:
        return 'circle-help';
    }
  });

  badgeLabel = computed<string>(() => {
    switch (this.status()) {
      case 'pending':
        return 'KNOWLEDGE.STATUS_PENDING';
      case 'processing':
        return 'KNOWLEDGE.STATUS_PROCESSING';
      case 'completed':
        return 'KNOWLEDGE.STATUS_COMPLETED';
      case 'failed':
        return 'KNOWLEDGE.STATUS_FAILED';
      default:
        return 'COMMON.UNKNOWN';
    }
  });
}
