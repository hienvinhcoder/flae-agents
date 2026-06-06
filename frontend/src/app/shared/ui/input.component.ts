import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      @if (label()) {
        <label
          [for]="id()"
          class="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2"
        >
          {{ label() }}
        </label>
      }
      <input
        [id]="id()"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="onBlur()"
        class="h-10 w-full rounded-lg border border-border bg-app px-3 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30 disabled:opacity-50 disabled:cursor-not-allowed"
      />
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
export class InputComponent implements ControlValueAccessor {
  id = input<string>(`input-${Math.random().toString(36).substring(2, 9)}`);
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');

  value = signal<string>('');
  disabled = signal<boolean>(false);

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string | null | undefined): void {
    this.value.set(val || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  onBlur(): void {
    this.onTouched();
  }
}
