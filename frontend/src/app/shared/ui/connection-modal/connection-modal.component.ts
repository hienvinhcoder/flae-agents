import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ConnectionModalService } from '../../../core/services/connection-modal.service';

@Component({
  selector: 'app-connection-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  template: `
    @if (connectionModalService.isServerDown()) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
        <!-- Card Modal -->
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur-md animate-fade-in flex flex-col items-center">
          
          <!-- Danger Icon Outer Ring -->
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 mb-4 animate-pulse">
            <lucide-icon name="alert-triangle" class="h-8 w-8 text-rose-500"></lucide-icon>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-white tracking-wide mb-2">
            {{ 'CONNECTION_MODAL.TITLE' | translate }}
          </h3>

          <!-- Description -->
          <p class="text-sm text-slate-400 mb-6 leading-relaxed max-w-xs">
            {{ 'CONNECTION_MODAL.MESSAGE' | translate }}
          </p>

          <!-- Action Button -->
          <button 
            (click)="retry()" 
            [disabled]="connectionModalService.isChecking()"
            class="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-950/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
            
            @if (connectionModalService.isChecking()) {
              <!-- Spinner -->
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ 'CONNECTION_MODAL.CHECKING' | translate }}</span>
            } @else {
              <lucide-icon name="refresh-cw" class="w-4 h-4"></lucide-icon>
              <span>{{ 'CONNECTION_MODAL.RETRY_BTN' | translate }}</span>
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `]
})
export class ConnectionModalComponent {
  readonly connectionModalService = inject(ConnectionModalService);

  /**
   * Click thử lại kết nối
   */
  retry(): void {
    this.connectionModalService.retryConnection();
  }
}
