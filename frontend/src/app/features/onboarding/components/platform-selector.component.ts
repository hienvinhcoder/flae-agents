import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformType } from '../../../core/models/workspace.model';

@Component({
  selector: 'app-platform-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- Manual Card -->
      <button 
        (click)="selectPlatform(PlatformType.MANUAL)"
        [class.ring-2]="selectedPlatform === PlatformType.MANUAL"
        [class.ring-primary]="selectedPlatform === PlatformType.MANUAL"
        [class.bg-white]="selectedPlatform === PlatformType.MANUAL"
        [class.shadow-soft]="selectedPlatform === PlatformType.MANUAL"
        class="relative p-8 rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md hover:bg-white hover:shadow-[0_8px_30px_rgba(0,194,122,0.15)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center group overflow-hidden">
        
        <!-- Hover Glow effect -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div class="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 z-10 relative">
          <svg class="w-8 h-8 text-dark-green/70 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
          </svg>
        </div>
        <h3 class="font-heading font-semibold text-lg text-dark-green mb-2 relative z-10">Tạo thủ công</h3>
        <p class="text-sm text-dark-green/60 leading-relaxed relative z-10">Tự do thiết lập dữ liệu doanh nghiệp từ đầu</p>
        
        <!-- Active indicator -->
        <div *ngIf="selectedPlatform === PlatformType.MANUAL" class="absolute top-4 right-4 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-ai-glow">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
      </button>

      <!-- Haravan Card -->
      <button 
        (click)="selectPlatform(PlatformType.HARAVAN)"
        [class.ring-2]="selectedPlatform === PlatformType.HARAVAN"
        [class.ring-primary]="selectedPlatform === PlatformType.HARAVAN"
        [class.bg-white]="selectedPlatform === PlatformType.HARAVAN"
        [class.shadow-soft]="selectedPlatform === PlatformType.HARAVAN"
        class="relative p-8 rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md hover:bg-white hover:shadow-[0_8px_30px_rgba(29,78,216,0.1)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center group overflow-hidden">
        
        <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div class="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 z-10 relative">
          <svg class="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.003 0C5.378 0 0 5.378 0 12.003s5.378 12.003 12.003 12.003 12.003-5.378 12.003-12.003S18.628 0 12.003 0zm4.5 16.5h-2.25v-4.5H9.75v4.5H7.5v-9h2.25v3h4.5v-3h2.25v9z"/>
          </svg>
        </div>
        <h3 class="font-heading font-semibold text-lg text-dark-green mb-2 relative z-10">Haravan</h3>
        <p class="text-sm text-dark-green/60 leading-relaxed relative z-10">Đồng bộ toàn bộ dữ liệu từ cửa hàng Haravan</p>

        <div *ngIf="selectedPlatform === PlatformType.HARAVAN" class="absolute top-4 right-4 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-ai-glow">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
      </button>

      <!-- KiotViet Card -->
      <button 
        (click)="selectPlatform(PlatformType.KIOTVIET)"
        [class.ring-2]="selectedPlatform === PlatformType.KIOTVIET"
        [class.ring-primary]="selectedPlatform === PlatformType.KIOTVIET"
        [class.bg-white]="selectedPlatform === PlatformType.KIOTVIET"
        [class.shadow-soft]="selectedPlatform === PlatformType.KIOTVIET"
        class="relative p-8 rounded-3xl border border-white/60 bg-white/40 backdrop-blur-md hover:bg-white hover:shadow-[0_8px_30px_rgba(22,163,74,0.1)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center group overflow-hidden">
        
        <div class="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div class="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 border border-green-200/50 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 z-10 relative">
          <span class="text-green-600 font-bold text-2xl font-heading">K</span>
        </div>
        <h3 class="font-heading font-semibold text-lg text-dark-green mb-2 relative z-10">KiotViet</h3>
        <p class="text-sm text-dark-green/60 leading-relaxed relative z-10">Đồng bộ mạnh mẽ từ hệ thống POS KiotViet</p>

        <div *ngIf="selectedPlatform === PlatformType.KIOTVIET" class="absolute top-4 right-4 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-ai-glow">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
      </button>
    </div>
  `
})
export class PlatformSelectorComponent {
  @Input() selectedPlatform: PlatformType | null = null;
  @Output() platformSelect = new EventEmitter<PlatformType>();

  PlatformType = PlatformType;

  selectPlatform(platform: PlatformType) {
    this.platformSelect.emit(platform);
  }
}
