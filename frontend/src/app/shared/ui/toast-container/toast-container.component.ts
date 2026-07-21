import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService, ToastMessage } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-6 right-6 z-9999 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 transform hover:scale-[1.02] flex items-start gap-3 bg-slate-900/95 border-slate-800 text-slate-100"
          [ngClass]="{
            'border-emerald-500/30 bg-slate-900/95 shadow-emerald-950/10': toast.type === 'success',
            'border-rose-500/30 bg-slate-900/95 shadow-rose-950/10': toast.type === 'error',
            'border-amber-500/30 bg-slate-900/95 shadow-amber-950/10': toast.type === 'warning',
            'border-blue-500/30 bg-slate-900/95 shadow-blue-950/10': toast.type === 'info'
          }">
          
          <!-- Icon -->
          <div class="shrink-0 mt-0.5" [ngClass]="{
            'text-emerald-400': toast.type === 'success',
            'text-rose-400': toast.type === 'error',
            'text-amber-400': toast.type === 'warning',
            'text-blue-400': toast.type === 'info'
          }">
            @if (toast.type === 'success') {
              <lucide-icon name="circle-check" class="w-5 h-5"></lucide-icon>
            } @else if (toast.type === 'error') {
              <lucide-icon name="alert-triangle" class="w-5 h-5"></lucide-icon>
            } @else if (toast.type === 'warning') {
              <lucide-icon name="alert-triangle" class="w-5 h-5"></lucide-icon>
            } @else {
              <lucide-icon name="bell" class="w-5 h-5"></lucide-icon>
            }
          </div>

          <!-- Content -->
          <div class="grow flex flex-col gap-0.5">
            @if (toast.title) {
              <span class="text-sm font-semibold tracking-wide text-white">{{ toast.title }}</span>
            }
            <span class="text-xs font-normal leading-relaxed text-slate-300">{{ toast.message }}</span>
          </div>

          <!-- Close Button -->
          <button 
            (click)="toastService.remove(toast.id)" 
            class="shrink-0 text-slate-400 hover:text-white rounded-lg p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-700/50">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>

          <!-- Progress Bar (Chạy ngầm để biểu thị thời gian tồn tại) -->
          @if (toast.duration && toast.duration > 0) {
            <div 
              class="absolute bottom-0 left-0 right-0 h-0.5 origin-left toast-progress-bar"
              [ngClass]="{
                'bg-emerald-500/50': toast.type === 'success',
                'bg-rose-500/50': toast.type === 'error',
                'bg-amber-500/50': toast.type === 'warning',
                'bg-blue-500/50': toast.type === 'info'
              }"
              [style.animation-duration.ms]="toast.duration">
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes shrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    .toast-progress-bar {
      animation: shrink linear forwards;
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
