import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-option-card',
  standalone: true,
  template: `
    <button 
      (click)="onClick.emit()"
      class="w-full flex items-center justify-between p-5 rounded-xl border border-gray-200 hover:border-secondary hover:bg-gray-50 transition-all duration-200 cursor-pointer group text-left"
    >
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors duration-200">
          <ng-content></ng-content>
        </div>
        <div>
          <h3 class="font-semibold text-primary text-lg">{{ title() }}</h3>
          <p class="text-sm text-secondary">{{ description() }}</p>
        </div>
      </div>
    </button>
  `
})
export class OptionCardComponent {
  title = input.required<string>();
  description = input.required<string>();
  onClick = output<void>();
}
