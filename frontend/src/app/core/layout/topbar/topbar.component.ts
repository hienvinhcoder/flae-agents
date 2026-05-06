import { Component, Input, Output, EventEmitter, inject, Signal } from '@angular/core';

import { LucideAngularModule, Menu, Sparkles, ChevronDown, Check } from 'lucide-angular';
import { AuthStore } from '../../../core/stores/auth.store';
import { WorkspaceStore } from '../../../core/stores/workspace.store';
import { Workspace } from '../../../core/models/workspace.model';
import { User } from '../../../core/models/auth.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    LucideAngularModule
],
  template: `
    <header class="h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-soft-green/50 px-4 flex items-center justify-between">
    
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        @if (isMobile) {
          <button (click)="toggleMenu()" class="p-2 -ml-2 text-dark-green/70 hover:text-primary transition-colors cursor-pointer rounded-lg">
            <lucide-icon name="menu" class="w-5 h-5"></lucide-icon>
          </button>
        }
    
        <!-- Page Title / Breadcrumb (Can be dynamic later) -->
        <h1 class="font-heading font-semibold text-lg text-dark-green hidden sm:block">
          {{ pageTitle }}
        </h1>
      </div>
    
      <div class="flex items-center gap-4">
    
        <!-- AI Notification / Quick Action -->
        <button class="relative p-2 text-dark-green/70 hover:text-accent transition-colors cursor-pointer rounded-full hover:bg-dark-green/5 group">
          <lucide-icon name="sparkles" class="w-5 h-5 group-hover:text-accent"></lucide-icon>
          <!-- Notification Dot -->
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" style="box-shadow: var(--shadow-ai-glow)"></span>
        </button>
    
        <!-- Workspace Selector -->
        @if (workspaces().length > 0) {
          <div class="relative group hidden sm:block">
            <button class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-mint-white border border-transparent hover:border-soft-green/50 transition-all cursor-pointer">
              <span class="font-medium text-sm text-dark-green truncate max-w-[150px]">
                {{ currentWorkspace()?.name || 'Select Workspace' }}
              </span>
              <lucide-icon name="chevron-down" class="w-4 h-4 text-dark-green/60"></lucide-icon>
            </button>
            <!-- Dropdown (Simple CSS hover based for now) -->
            <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-soft border border-soft-green/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top scale-95 group-hover:scale-100 z-50">
              <div class="p-2 space-y-1">
                @for (ws of workspaces(); track ws) {
                  <button
                    class="w-full text-left px-3 py-2 text-sm text-dark-green/80 hover:bg-mint-white hover:text-primary rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                    [class.bg-mint-white]="ws.id === currentWorkspace()?.id"
                    [class.text-primary]="ws.id === currentWorkspace()?.id">
                    <span class="truncate">{{ ws.name }}</span>
                    @if (ws.id === currentWorkspace()?.id) {
                      <lucide-icon name="check" class="w-4 h-4"></lucide-icon>
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        }
    
        <div class="w-px h-6 bg-soft-green/50 hidden sm:block"></div>
    
        <!-- User Profile -->
        <div class="flex items-center gap-3 cursor-pointer group">
          <div class="hidden sm:flex flex-col items-end">
            <span class="text-sm font-medium text-dark-green">{{ currentUser()?.full_name || 'User' }}</span>
            <span class="text-xs text-dark-green/60">{{ currentUser()?.email }}</span>
          </div>
          <div class="w-9 h-9 rounded-full bg-mint-white border border-soft-green flex items-center justify-center text-primary font-bold overflow-hidden">
            @if (currentUser()?.avatar_url) {
              <img [src]="currentUser()?.avatar_url" alt="Avatar" class="w-full h-full object-cover">
            }
            @if (!currentUser()?.avatar_url) {
              <span>{{ (currentUser()?.full_name || 'U').charAt(0).toUpperCase() }}</span>
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
