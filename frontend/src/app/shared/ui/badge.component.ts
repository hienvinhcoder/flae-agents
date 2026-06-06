import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span [class]="badgeClass()">
      <ng-content></ng-content>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class BadgeComponent {
  variant = input<'graph' | 'primary' | 'ai' | 'warning' | 'error' | 'default'>('default');

  badgeClass(): string {
    const base =
      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors duration-200';

    let variantClass = '';
    switch (this.variant()) {
      case 'default':
        variantClass = 'border-border bg-subtle text-text-secondary';
        break;
      case 'graph':
        variantClass = 'border-graph-border bg-graph-soft text-green-200';
        break;
      case 'primary':
        variantClass = 'border-primary-border bg-primary-soft text-orange-200';
        break;
      case 'ai':
        variantClass = 'border-ai-border bg-ai-soft text-purple-100';
        break;
      case 'warning':
        variantClass = 'border-warning-border bg-warning-soft text-yellow-100';
        break;
      case 'error':
        variantClass = 'border-error-border bg-error-soft text-red-200';
        break;
    }

    return `${base} ${variantClass}`;
  }
}
