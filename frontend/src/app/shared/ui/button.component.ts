import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="buttonClass()"
      (click)="onClick($event)"
    >
      @if (loading()) {
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
    `,
  ],
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'ai' | 'destructive'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  rounded = input<'md' | 'xl' | 'full'>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);

  btnClick = output<MouseEvent>();

  buttonClass(): string {
    const base =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app disabled:opacity-50 disabled:cursor-not-allowed w-full active:scale-[0.97] cursor-pointer';

    // Rounding classes
    let roundedClass = 'rounded-md';
    if (this.rounded() === 'xl') {
      roundedClass = 'rounded-xl';
    } else if (this.rounded() === 'full') {
      roundedClass = 'rounded-full';
    }

    // Size classes
    let sizeClass = 'px-4 py-2.5 text-sm';
    if (this.size() === 'sm') {
      sizeClass = 'px-3 py-1.5 text-xs';
    } else if (this.size() === 'lg') {
      sizeClass = 'px-5 py-3 text-base';
    }

    // Variant classes
    let variantClass = '';
    switch (this.variant()) {
      case 'primary':
        variantClass =
          'bg-primary text-app shadow-[0_4px_12px_rgba(251,146,60,0.15)] hover:bg-primary-hover hover:shadow-[0_4px_20px_rgba(251,146,60,0.3)] focus:ring-primary/50';
        break;
      case 'secondary':
        variantClass =
          'border border-border bg-elevated text-text-primary hover:border-border-strong hover:bg-subtle focus:ring-border-strong/50';
        break;
      case 'ai':
        variantClass =
          'border border-ai-border bg-ai-soft text-purple-100 hover:bg-ai-soft/80 hover:border-ai hover:shadow-[0_0_15px_rgba(168,85,247,0.25)] focus:ring-ai/50';
        break;
      case 'destructive':
        variantClass =
          'border border-error-border bg-error-soft text-red-200 hover:bg-error-soft/80 hover:border-error focus:ring-error/50';
        break;
    }

    return `${base} ${roundedClass} ${sizeClass} ${variantClass}`;
  }

  onClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.btnClick.emit(event);
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
