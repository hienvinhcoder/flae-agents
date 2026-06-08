import { Component, Input, Output, EventEmitter, inject, Signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';
import { AuthStore } from '../../../stores/auth.store';
import { User } from '../../../models/auth.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    LucideAngularModule,
    TranslateModule
  ],
  template: `
    <header class="h-16 sticky top-0 z-30 bg-surface border-b border-border px-6 flex items-center justify-between">
    
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        @if (isMobile) {
          <button (click)="toggleMenu()" class="p-2 -ml-2 text-text-secondary hover:text-primary hover:bg-white/5 transition-all cursor-pointer rounded-xl">
            <lucide-icon name="menu" class="w-5 h-5"></lucide-icon>
          </button>
        }
    
        <!-- Page Title -->
        <h1 class="font-heading font-bold text-lg text-text-primary hidden sm:block tracking-tight">
          {{ pageTitle }}
        </h1>
      </div>
    
      <div class="flex items-center gap-4">
    
        <!-- AI Notification / Quick Action -->
        <button [title]="'TOPBAR.AI_ACTION' | translate" class="relative p-2 text-primary hover:text-primary hover:bg-white/5 transition-all cursor-pointer rounded-xl group">
          <lucide-icon name="sparkles" class="w-4.5 h-4.5 group-hover:scale-105 transition-transform duration-200"></lucide-icon>
          <!-- Notification Dot -->
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-active animate-ping"></span>
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-active shadow-ai-glow"></span>
        </button>
    
        <!-- Language Selector -->
        <div class="relative group">
          <button [title]="'COMMON.LANGUAGE' | translate" class="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer rounded-xl">
            <lucide-icon name="languages" class="w-4 h-4 text-text-muted"></lucide-icon>
            <span class="font-semibold text-xs text-text-primary uppercase">
              {{ languageService.currentLang() }}
            </span>
            <lucide-icon name="chevron-down" class="w-3 h-3 text-text-disabled group-hover:rotate-180 transition-transform duration-200"></lucide-icon>
          </button>
          
          <!-- Language Dropdown -->
          <div class="absolute right-0 top-full mt-2 w-36 dropdown-container opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-250 transform origin-top-right scale-95 group-hover:scale-100 z-50">
            <div class="space-y-0.5">
              <button
                (click)="languageService.setLanguage('vi')"
                class="w-full dropdown-item text-xs px-2.5 py-1.5 flex items-center justify-between"
                [class.bg-white/5]="languageService.currentLang() === 'vi'"
                [class.text-primary]="languageService.currentLang() === 'vi'"
                [class.font-semibold]="languageService.currentLang() === 'vi'">
                <span>Tiếng Việt</span>
                @if (languageService.currentLang() === 'vi') {
                  <lucide-icon name="check" class="w-3.5 h-3.5 text-primary"></lucide-icon>
                }
              </button>
              <button
                (click)="languageService.setLanguage('en')"
                class="w-full dropdown-item text-xs px-2.5 py-1.5 flex items-center justify-between"
                [class.bg-white/5]="languageService.currentLang() === 'en'"
                [class.text-primary]="languageService.currentLang() === 'en'"
                [class.font-semibold]="languageService.currentLang() === 'en'">
                <span>English</span>
                @if (languageService.currentLang() === 'en') {
                  <lucide-icon name="check" class="w-3.5 h-3.5 text-primary"></lucide-icon>
                }
              </button>
            </div>
          </div>
        </div>
    
        <div class="w-px h-6 bg-border hidden sm:block"></div>
    
        <!-- User Profile -->
        <div class="flex items-center gap-3 cursor-pointer group">
          <div class="hidden sm:flex flex-col items-end select-none">
            <span class="text-xs font-semibold text-text-primary group-hover:text-primary transition-colors">{{ currentUser()?.full_name || 'User' }}</span>
            <span class="text-[10px] text-text-muted">{{ currentUser()?.email }}</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-primary-soft border border-border-strong flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm group-hover:border-primary/45 transition-all">
            @if (currentUser()?.avatar_url) {
              <img [src]="currentUser()?.avatar_url" alt="Avatar" class="w-full h-full object-cover">
            }
            @if (!currentUser()?.avatar_url) {
              <span class="font-heading text-sm">{{ (currentUser()?.full_name || 'U').charAt(0).toUpperCase() }}</span>
            }
          </div>
        </div>
    
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TopbarComponent {
  authStore = inject(AuthStore);
  languageService = inject(LanguageService);

  @Input() isMobile: boolean = false;
  @Input() pageTitle: string = 'Dashboard';
  @Output() menuToggle = new EventEmitter<void>();

  currentUser: Signal<User | null> = this.authStore.currentUser;

  toggleMenu() {
    this.menuToggle.emit();
  }
}

