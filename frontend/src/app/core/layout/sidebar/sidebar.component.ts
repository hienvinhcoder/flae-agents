import { Component, Input, Output, EventEmitter } from '@angular/core';

import { RouterModule } from '@angular/router';
import { LucideAngularModule, Sun, MessageSquare, Bot, BookOpen, BarChart2, PhoneCall, Settings, X, ChevronRight, ChevronLeft } from 'lucide-angular';

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
      class="h-screen bg-white/80 backdrop-blur-md border-r border-soft-green/50 flex flex-col transition-all duration-300 ease-in-out relative"
      [class.w-64]="!collapsed"
      [class.w-20]="collapsed"
      [class.absolute]="isMobile"
      [class.z-50]="isMobile"
      [class.-translate-x-full]="isMobile && collapsed"
      [class.translate-x-0]="isMobile && !collapsed">
    
      <!-- Logo Area -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-soft-green/50 shrink-0">
        @if (!collapsed) {
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
              F
            </div>
            <span class="font-heading font-semibold text-dark-green text-lg whitespace-nowrap">FLAE Agent</span>
          </div>
        }
        @if (collapsed && !isMobile) {
          <div class="w-full flex justify-center">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
              F
            </div>
          </div>
        }
        @if (isMobile) {
          <button (click)="toggleCollapse()" class="text-dark-green/60 hover:text-primary transition-colors cursor-pointer p-1">
            <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
          </button>
        }
      </div>
    
      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        @for (item of navItems; track item) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-mint-white text-primary border-r-2 border-primary font-medium"
            [routerLinkActiveOptions]="{exact: false}"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-dark-green/70 hover:bg-mint-white hover:text-primary transition-colors duration-200 cursor-pointer group relative"
            [title]="collapsed && !isMobile ? item.name : ''"
            (click)="onNavItemClick()">
            <lucide-icon [name]="item.icon" class="w-5 h-5 flex-shrink-0" [class.text-primary]="item.path === currentPath"></lucide-icon>
            <span class="truncate whitespace-nowrap transition-opacity duration-300"
              [class.opacity-0]="collapsed && !isMobile"
              [class.hidden]="collapsed && !isMobile">
              {{ item.name }}
            </span>
          </a>
        }
      </nav>
    
      <!-- Collapse Toggle (Desktop only) -->
      @if (!isMobile) {
        <div class="p-4 border-t border-soft-green/50 flex justify-end shrink-0">
          <button (click)="toggleCollapse()"
            class="p-2 rounded-lg text-dark-green/60 hover:bg-mint-white hover:text-primary transition-colors cursor-pointer w-full flex justify-center items-center">
            <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" class="w-5 h-5"></lucide-icon>
          </button>
        </div>
      }
    </aside>
    
    <!-- Overlay for mobile -->
    @if (isMobile && !collapsed) {
      <div
        class="fixed inset-0 bg-dark-green/20 backdrop-blur-sm z-40"
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
    { name: 'Voice Calls', path: '/dashboard/voice', icon: 'phone-call' },
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
