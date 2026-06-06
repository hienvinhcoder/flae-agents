import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div [class]="cardClass()">
      <!-- Header Projection -->
      @if (hasHeader()) {
        <div class="mb-4">
          <ng-content select="[card-header]"></ng-content>
        </div>
      }
      
      <!-- Body/Main Projection -->
      <div class="text-sm text-text-secondary leading-6">
        <ng-content></ng-content>
      </div>

      <!-- Footer Projection -->
      @if (hasFooter()) {
        <div class="mt-4 pt-4 border-t border-border/40">
          <ng-content select="[card-footer]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class CardComponent {
  variant = input<'default' | 'elevated' | 'ai'>('default');
  hasHeader = input<boolean>(false);
  hasFooter = input<boolean>(false);
  noPadding = input<boolean>(false);

  cardClass(): string {
    const base = 'rounded-xl transition duration-200';
    
    // Padding
    const paddingClass = this.noPadding() ? '' : 'p-5';

    // Variant style
    let variantClass = '';
    switch (this.variant()) {
      case 'default':
        variantClass = 'border border-border bg-surface shadow-soft';
        break;
      case 'elevated':
        variantClass = 'border border-strong bg-elevated shadow-soft';
        break;
      case 'ai':
        variantClass = 'border border-ai-border bg-ai-soft';
        break;
    }

    return `${base} ${paddingClass} ${variantClass}`;
  }
}
