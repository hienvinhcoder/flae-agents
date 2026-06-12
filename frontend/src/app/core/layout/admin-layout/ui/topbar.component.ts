import { Component, Input, Output, EventEmitter, inject, Signal, signal, effect, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';
import { AuthService } from '../../../services/auth.service';
import { AuthStore } from '../../../stores/auth.store';
import { WorkspaceStore } from '../../../stores/workspace.store';
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
    
        <!-- User Profile Dropdown -->
        <div class="relative">
          <button (click)="toggleProfileDropdown($event)" class="flex items-center gap-3 cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded-xl transition-all select-none">
            <div class="hidden sm:flex flex-col items-end text-left select-none">
              <span class="text-xs font-semibold text-text-primary hover:text-primary transition-colors">{{ currentUser()?.full_name || 'User' }}</span>
              <span class="text-[10px] text-text-muted">{{ currentUser()?.email }}</span>
            </div>
            <div class="w-9 h-9 rounded-full bg-primary-soft border border-border-strong flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm transition-all relative">
              @if (currentUser()?.avatar_url && !avatarLoadError()) {
                <img [src]="currentUser()?.avatar_url" alt="Avatar" class="w-full h-full object-cover" (error)="onAvatarError()">
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary bg-primary-soft w-full h-full p-1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
            <lucide-icon name="chevron-down" class="w-3.5 h-3.5 text-text-disabled transition-transform duration-200" [class.rotate-180]="isProfileOpen()"></lucide-icon>
          </button>

          <!-- Dropdown Menu -->
          @if (isProfileOpen()) {
            <div class="absolute right-0 top-full mt-2 w-56 dropdown-container opacity-100 visible transition-all duration-200 z-50 shadow-lg">
              <!-- Header với user info cho mobile -->
              <div class="px-4 py-3 border-b border-border sm:hidden">
                <p class="text-xs font-semibold text-text-primary truncate">{{ currentUser()?.full_name || 'User' }}</p>
                <p class="text-[10px] text-text-muted truncate">{{ currentUser()?.email }}</p>
              </div>
              
              <div class="p-1 space-y-0.5">
                <button (click)="navigateToSettings()" class="w-full dropdown-item text-xs px-3 py-2 flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                  <lucide-icon name="user" class="w-4 h-4"></lucide-icon>
                  <span>{{ 'COMMON.PROFILE' | translate }}</span>
                </button>
                <button (click)="navigateToSettings()" class="w-full dropdown-item text-xs px-3 py-2 flex items-center gap-2 text-text-secondary hover:text-text-primary cursor-pointer">
                  <lucide-icon name="settings" class="w-4 h-4"></lucide-icon>
                  <span>{{ 'NAV.SETTINGS' | translate }}</span>
                </button>
                
                <div class="h-px bg-border my-1"></div>
                
                <button (click)="logout()" class="w-full dropdown-item text-xs px-3 py-2 flex items-center gap-2 text-status-inactive hover:text-status-inactive/80 cursor-pointer">
                  <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
                  <span>{{ 'COMMON.LOGOUT' | translate }}</span>
                </button>
              </div>
            </div>
          }
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
  authService = inject(AuthService);
  workspaceStore = inject(WorkspaceStore);
  languageService = inject(LanguageService);
  router = inject(Router);
  elementRef = inject(ElementRef);

  @Input() isMobile: boolean = false;
  @Input() pageTitle: string = 'Dashboard';
  @Output() menuToggle = new EventEmitter<void>();

  currentUser: Signal<User | null> = this.authStore.currentUser;
  avatarLoadError = signal(false);
  isProfileOpen = signal(false);

  constructor() {
    // Reset flag error avatar khi thay đổi user
    effect(() => {
      this.currentUser();
      this.avatarLoadError.set(false);
    });
  }

  toggleMenu() {
    this.menuToggle.emit();
  }

  onAvatarError() {
    this.avatarLoadError.set(true);
  }

  toggleProfileDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isProfileOpen.update(v => !v);
  }

  navigateToSettings() {
    this.isProfileOpen.set(false);
    this.router.navigate(['/dashboard/settings']);
  }

  logout() {
    this.isProfileOpen.set(false);
    this.authStore.setLoading(true);
    this.authService.logout().subscribe({
      next: () => {
        this.authStore.reset();
        this.workspaceStore.reset();
        this.authStore.setLoading(false);
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.authStore.setError('Đăng xuất thất bại. Vui lòng thử lại!');
        this.authStore.setLoading(false);
        console.error('Lỗi khi đăng xuất:', err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileOpen.set(false);
    }
  }
}

