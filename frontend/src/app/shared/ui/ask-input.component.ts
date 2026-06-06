import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-ask-input',
  standalone: true,
  template: `
    <div
      class="rounded-2xl border border-border-strong bg-surface p-3 shadow-soft transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      [class.opacity-50]="disabled()"
      [class.pointer-events-none]="disabled()"
    >
      <textarea
        [placeholder]="placeholder()"
        [value]="query()"
        (input)="onInput($event)"
        (keydown.enter)="onEnterKey($event)"
        [disabled]="disabled() || loading()"
        class="min-h-24 w-full resize-none bg-transparent text-sm leading-6 text-text-primary placeholder:text-text-disabled outline-none"
      ></textarea>

      <div class="mt-3 flex items-center justify-between">
        <div class="text-xs text-text-muted">
          {{ citationText() }}
        </div>

        <button
          [disabled]="disabled() || loading() || !query().trim()"
          (click)="onSubmit()"
          class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-app hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
        >
          @if (loading()) {
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-app"
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
          {{ buttonText() }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class AskInputComponent {
  placeholder = input<string>('Ask anything about your company memory...');
  citationText = input<string>('Answers include citations from your sources.');
  buttonText = input<string>('Ask');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);

  ask = output<string>();

  query = signal<string>('');

  onInput(event: Event): void {
    this.query.set((event.target as HTMLTextAreaElement).value);
  }

  onSubmit(): void {
    const val = this.query().trim();
    if (val && !this.loading() && !this.disabled()) {
      this.ask.emit(val);
      this.query.set('');
    }
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    // Gửi khi nhấn Enter mà không nhấn Shift
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.onSubmit();
    }
  }
}
