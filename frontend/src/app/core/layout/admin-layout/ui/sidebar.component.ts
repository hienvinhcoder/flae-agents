import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

export interface NavItem {
  name: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    LucideAngularModule
  ],
  template: `
    <aside
      class="h-screen bg-white/75 backdrop-blur-xl border-r border-outline-variant/20 flex flex-col transition-all duration-300 ease-in-out relative shadow-soft select-none z-40"
      [class.w-64]="!collapsed"
      [class.w-20]="collapsed"
      [class.absolute]="isMobile"
      [class.z-50]="isMobile"
      [class.-translate-x-full]="isMobile && collapsed"
      [class.translate-x-0]="isMobile && !collapsed">
    
      <!-- Logo Area -->
      <div class="h-16 flex items-center justify-between px-5 border-b border-outline-variant/15 shrink-0">
        @if (!collapsed) {
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white font-bold text-base shadow-[0_2px_8px_rgba(0,108,73,0.25)] shrink-0 transition-transform duration-300 hover:scale-105">
              F
            </div>
            <span class="font-heading font-bold text-text-heading text-lg whitespace-nowrap tracking-tight bg-gradient-to-r from-text-heading to-primary bg-clip-text text-transparent">FLAE Agent</span>
          </div>
        }
        @if (collapsed && !isMobile) {
          <div class="w-full flex justify-center">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white font-bold text-base shadow-[0_2px_8px_rgba(0,108,73,0.25)] shrink-0 transition-transform duration-300 hover:scale-105">
              F
            </div>
          </div>
        }
        @if (isMobile) {
          <button (click)="toggleCollapse()" class="text-text-body/60 hover:text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-primary-container/10">
            <lucide-icon name="x" class="w-4.5 h-4.5"></lucide-icon>
          </button>
        }
      </div>
    
      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto py-5 px-3.5 space-y-1">
        @for (item of navItems; track item) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-primary/8 text-primary font-semibold border-l-3 border-primary shadow-sm"
            [routerLinkActiveOptions]="{exact: false}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-body/80 hover:bg-primary/5 hover:text-primary transition-all duration-200 cursor-pointer group relative font-medium"
            [title]="collapsed && !isMobile ? item.name : ''"
            (click)="onNavItemClick()">
            <lucide-icon [name]="item.icon" class="w-5 h-5 flex-shrink-0 transition-colors duration-200 group-hover:text-primary" [class.text-primary]="item.path === currentPath"></lucide-icon>
            <span class="truncate whitespace-nowrap transition-opacity duration-300 text-sm"
              [class.opacity-0]="collapsed && !isMobile"
              [class.hidden]="collapsed && !isMobile">
              {{ item.name }}
            </span>
          </a>
        }
      </nav>
    
      <!-- Version & Quick Agent Indicator -->
      <div class="p-4 border-t border-outline-variant/15 shrink-0 flex items-center gap-3 bg-white/40" [class.justify-center]="collapsed">
        <div class="w-8 h-8 rounded-full bg-primary-container/15 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm">
          AI
        </div>
        @if (!collapsed) {
          <div class="flex flex-col overflow-hidden">
            <span class="text-xs font-semibold text-text-heading">FLAE Engine v1.0</span>
            <span class="text-[10px] text-text-body/50">Đang hoạt động ổn định</span>
          </div>
        }
      </div>

      <!-- Collapse Toggle (Desktop only, floating circular button on edge) -->
      @if (!isMobile) {
        <button (click)="toggleCollapse()"
          class="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-outline-variant/35 flex items-center justify-center text-text-body/60 hover:text-primary shadow-soft cursor-pointer hover:scale-105 active:scale-95 transition-all z-50">
          <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" class="w-3.5 h-3.5"></lucide-icon>
        </button>
      }
    </aside>
    
    <!-- Overlay for mobile -->
    @if (isMobile && !collapsed) {
      <div
        class="fixed inset-0 bg-dark-green/20 backdrop-blur-sm z-30 transition-opacity duration-300"
        (click)="toggleCollapse()">
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class SidebarComponent {
  @Input() currentPath: string = '';
  @Input() collapsed: boolean = false;
  @Input() isMobile: boolean = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly navItems: NavItem[] = [
    { name: 'Morning Briefing', path: '/dashboard/briefing', icon: 'sun' },
    { name: 'Omnichannel Inbox', path: '/dashboard/inbox', icon: 'message-square' },
    { name: 'My Agent Team', path: '/dashboard/agents', icon: 'bot' },
    { name: 'Knowledge Base', path: '/dashboard/knowledge', icon: 'book-open' },
    { name: 'Analyst Reports', path: '/dashboard/reports', icon: 'bar-chart-2' },
    { name: 'Settings', path: '/dashboard/settings', icon: 'settings' }
  ];

  toggleCollapse() {
    this.collapsedChange.emit(!this.collapsed);
  }

  onNavItemClick() {
    if (this.isMobile) {
      this.collapsedChange.emit(true);
    }
  }
}
