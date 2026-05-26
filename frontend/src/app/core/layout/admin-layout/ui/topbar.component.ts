import { Component, Input, Output, EventEmitter, inject, Signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthStore } from '../../../stores/auth.store';
import { WorkspaceStore } from '../../../stores/workspace.store';
import { Workspace } from '../../../models/workspace.model';
import { User } from '../../../models/auth.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    LucideAngularModule
  ],
  template: `
    <header class="h-16 sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-outline-variant/15 px-6 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.015)]">
    
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        @if (isMobile) {
          <button (click)="toggleMenu()" class="p-2 -ml-2 text-text-body hover:text-primary hover:bg-primary/5 transition-all cursor-pointer rounded-xl">
            <lucide-icon name="menu" class="w-5 h-5"></lucide-icon>
          </button>
        }
    
        <!-- Page Title -->
        <h1 class="font-heading font-bold text-lg text-text-heading hidden sm:block tracking-tight">
          {{ pageTitle }}
        </h1>
      </div>
    
      <div class="flex items-center gap-4">
    
        <!-- AI Notification / Quick Action -->
        <button class="relative p-2 text-primary hover:text-primary bg-primary/5 hover:bg-primary/8 border border-primary/10 transition-all cursor-pointer rounded-xl group shadow-sm">
          <lucide-icon name="sparkles" class="w-4.5 h-4.5 group-hover:scale-105 transition-transform duration-200"></lucide-icon>
          <!-- Notification Dot -->
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-active animate-ping"></span>
          <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-active shadow-ai-glow"></span>
        </button>
    
        <!-- Workspace Selector -->
        @if (workspaces().length > 0) {
          <div class="relative group hidden sm:block">
            <button class="flex items-center gap-2 px-3 py-1.5 bg-white border border-outline-variant/35 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 cursor-pointer shadow-soft">
              <div class="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center font-heading font-semibold text-xs">
                {{ (currentWorkspace()?.name || 'W').charAt(0).toUpperCase() }}
              </div>
              <span class="font-semibold text-sm text-text-heading truncate max-w-[150px]">
                {{ currentWorkspace()?.name || 'Select Workspace' }}
              </span>
              <lucide-icon name="chevron-down" class="w-3.5 h-3.5 text-text-body/50 group-hover:rotate-180 transition-transform duration-200"></lucide-icon>
            </button>
            
            <!-- Dropdown (Glassmorphism & animated shadow) -->
            <div class="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass border border-outline-variant/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-250 transform origin-top-right scale-95 group-hover:scale-100 z-50">
              <div class="p-2 space-y-1">
                @for (ws of workspaces(); track ws) {
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-text-body/80 hover:bg-primary/5 hover:text-primary rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between group/item"
                    [class.bg-primary/5]="ws.id === currentWorkspace()?.id"
                    [class.text-primary]="ws.id === currentWorkspace()?.id"
                    [class.font-semibold]="ws.id === currentWorkspace()?.id">
                    <div class="flex items-center gap-2 truncate">
                      <div class="w-5 h-5 rounded bg-outline-variant/20 group-hover/item:bg-primary/10 group-hover/item:text-primary text-text-body flex items-center justify-center font-heading text-[10px] font-bold"
                           [class.bg-primary/10]="ws.id === currentWorkspace()?.id"
                           [class.text-primary]="ws.id === currentWorkspace()?.id">
                        {{ ws.name.charAt(0).toUpperCase() }}
                      </div>
                      <span class="truncate">{{ ws.name }}</span>
                    </div>
                    @if (ws.id === currentWorkspace()?.id) {
                      <lucide-icon name="check" class="w-3.5 h-3.5 text-primary"></lucide-icon>
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        }
    
        <div class="w-px h-6 bg-outline-variant/20 hidden sm:block"></div>
    
        <!-- User Profile -->
        <div class="flex items-center gap-3 cursor-pointer group">
          <div class="hidden sm:flex flex-col items-end select-none">
            <span class="text-xs font-semibold text-text-heading group-hover:text-primary transition-colors">{{ currentUser()?.full_name || 'User' }}</span>
            <span class="text-[10px] text-text-body/50">{{ currentUser()?.email }}</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/10 to-primary-container/10 border border-outline-variant/35 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm group-hover:border-primary/45 transition-all">
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
  workspaceStore = inject(WorkspaceStore);

  @Input() isMobile: boolean = false;
  @Input() pageTitle: string = 'Dashboard';
  @Output() menuToggle = new EventEmitter<void>();

  currentUser: Signal<User | null> = this.authStore.currentUser;
  workspaces: Signal<Workspace[]> = this.workspaceStore.workspaces;
  currentWorkspace: Signal<Workspace | null> = this.workspaceStore.currentWorkspace;

  toggleMenu() {
    this.menuToggle.emit();
  }
}
