import { Component, Input, Output, EventEmitter, inject, computed, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { WorkspaceStore } from '../../../stores/workspace.store';
import { WorkspaceSelectorComponent } from '../../../../shared/ui/workspace-selector/workspace-selector.component';
import { WorkspaceApiService } from '../../../services/api/workspace-api.service';

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  translationKey: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterModule,
    LucideAngularModule,
    TranslateModule,
    WorkspaceSelectorComponent
  ],
  template: `
    <aside
      class="h-screen bg-surface border-r border-border flex flex-col transition-all duration-300 ease-in-out relative select-none z-40"
      [class.w-[232px]]="!collapsed"
      [class.w-[72px]]="collapsed"
      [class.absolute]="isMobile"
      [class.z-50]="isMobile"
      [class.-translate-x-full]="isMobile && collapsed"
      [class.translate-x-0]="isMobile && !collapsed">
    
      <!-- Top Area: Logo & Workspace Switcher -->
      <div class="px-3 py-4 shrink-0">
        <app-workspace-selector
          [workspaces]="workspaceStore.workspaces()"
          [currentWorkspace]="workspaceStore.currentWorkspace()"
          [collapsed]="collapsed"
          [isMobile]="isMobile"
          [isCreatingWorkspace]="isCreatingWorkspace()"
          [createError]="createError()"
          variant="embedded"
          (collapsedChange)="toggleCollapse()"
          (workspaceSelected)="onWorkspaceSelected($event)"
          (createWorkspace)="onCreateWorkspace($event)"
        ></app-workspace-selector>
      </div>
    
      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto px-2.5 space-y-4 py-2">
        @for (group of menuGroups; track group.groupName) {
          <div class="space-y-1">
            @if (!collapsed) {
              <div class="px-2.5 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-[0.08em] select-none">
                {{ group.translationKey | translate }}
              </div>
            }
            @for (item of group.items; track item.path) {
              <a
                #rla="routerLinkActive"
                [routerLink]="item.path"
                routerLinkActive="bg-primary/10 text-primary relative before:absolute before:left-0 before:top-2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary"
                [routerLinkActiveOptions]="{exact: false}"
                [class.text-text-secondary]="!rla.isActive"
                [class.hover:bg-white/4]="!rla.isActive"
                [class.hover:text-text-primary]="!rla.isActive"
                class="flex h-8 items-center gap-2 px-2.5 rounded-md transition-all duration-200 cursor-pointer group relative font-medium"
                [class.justify-center]="collapsed"
                [title]="collapsed && !isMobile ? (item.translationKey | translate) : ''"
                (click)="onNavItemClick()">
                <lucide-icon [name]="item.icon" class="w-4 h-4 shrink-0 transition-colors duration-200 group-hover:text-primary" [class.text-primary]="rla.isActive"></lucide-icon>
                <span class="truncate whitespace-nowrap transition-opacity duration-300 text-[13px]"
                  [class.opacity-0]="collapsed && !isMobile"
                  [class.hidden]="collapsed && !isMobile">
                  {{ item.translationKey | translate }}
                </span>
              </a>
            }
          </div>
        }
      </nav>
    
      <!-- Footer sidebar -->
      <div class="px-3 py-3 border-t border-border shrink-0 flex items-center gap-3 bg-subtle/50" [class.justify-center]="collapsed">
        <div class="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 select-none">
          AI
        </div>
        @if (!collapsed) {
          <div class="flex flex-col overflow-hidden">
            <span class="text-xs font-semibold text-text-secondary">FLAE Engine v1.0</span>
            <span class="text-[11px] text-text-muted flex items-center gap-1.5 select-none leading-4">
              <span class="w-1.5 h-1.5 rounded-full"
                [class.bg-amber-500]="status() === 'Syncing'"
                [class.bg-rose-500]="status() === 'Needs attention'"
                [class.bg-emerald-500]="status() === 'Healthy'"></span>
              @if (status() === 'Syncing') { Đang đồng bộ... }
              @else if (status() === 'Needs attention') { Cần chú ý }
              @else { Online }
            </span>
          </div>
        }
      </div>
    
      <!-- Collapse Toggle (Desktop only, floating circular button on edge) -->
      @if (!isMobile) {
        <button (click)="toggleCollapse()"
          class="absolute -right-2.5 top-16 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-primary cursor-pointer hover:scale-105 active:scale-95 transition-all z-50">
          <lucide-icon [name]="collapsed ? 'chevron-right' : 'chevron-left'" class="w-3 h-3"></lucide-icon>
        </button>
      }
    </aside>
    
    <!-- Overlay for mobile -->
    @if (isMobile && !collapsed) {
      <div
        class="fixed inset-0 bg-app/80 backdrop-blur-sm z-30 transition-opacity duration-300"
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

  workspaceStore = inject(WorkspaceStore);
  private workspaceApiService = inject(WorkspaceApiService);
  private router = inject(Router);

  isCreatingWorkspace = signal<boolean>(false);
  createError = signal<string | null>(null);

  status = computed(() => {
    if (this.workspaceStore.isSyncing()) {
      return 'Syncing';
    }
    if (!this.workspaceStore.currentWorkspace()) {
      return 'Needs attention';
    }
    return 'Healthy';
  });

  readonly menuGroups = [
    {
      groupName: 'Main',
      translationKey: 'NAV.GROUP_MAIN',
      items: [
        { name: 'AI Chat', path: '/dashboard/chat', icon: 'sparkles', translationKey: 'NAV.CHAT' },
        { name: 'Morning Briefing', path: '/dashboard/briefing', icon: 'sun', translationKey: 'NAV.BRIEFING' },
        { name: 'Omnichannel Inbox', path: '/dashboard/inbox', icon: 'message-square', translationKey: 'NAV.INBOX' },
        { name: 'My Agent Team', path: '/dashboard/agents', icon: 'bot', translationKey: 'NAV.AGENTS' }
      ]
    },

    {
      groupName: 'Knowledge',
      translationKey: 'NAV.GROUP_KNOWLEDGE',
      items: [
        { name: 'Knowledge Base', path: '/dashboard/knowledge', icon: 'book-open', translationKey: 'NAV.KNOWLEDGE' },
        { name: 'Topics', path: '/dashboard/topics', icon: 'tags', translationKey: 'NAV.TOPICS' },
        { name: 'Analyst Reports', path: '/dashboard/reports', icon: 'bar-chart-2', translationKey: 'NAV.REPORTS' }
      ]
    },
    {
      groupName: 'Admin',
      translationKey: 'NAV.GROUP_ADMIN',
      items: [
        { name: 'Settings', path: '/dashboard/settings', icon: 'settings', translationKey: 'NAV.SETTINGS' }
      ]
    }
  ];

  toggleCollapse() {
    this.collapsedChange.emit(!this.collapsed);
  }

  onNavItemClick() {
    if (this.isMobile) {
      this.collapsedChange.emit(true);
    }
  }

  onWorkspaceSelected(id: string) {
    this.workspaceStore.setCurrentWorkspaceId(id);
    this.workspaceApiService.updateCurrentWorkspace(id).subscribe({
      error: (err) => {
        console.error('Lỗi khi đồng bộ workspace hoạt động lên database:', err);
      }
    });
  }

  onCreateWorkspace(name: string) {
    this.isCreatingWorkspace.set(true);
    this.createError.set(null);
    this.workspaceApiService.createManualWorkspace({ name }).subscribe({
      next: (newWs) => {
        this.workspaceStore.addWorkspace(newWs);
        this.workspaceStore.setCurrentWorkspaceId(newWs.id);
        this.isCreatingWorkspace.set(false);
      },
      error: (err) => {
        this.isCreatingWorkspace.set(false);
        this.createError.set('Không thể tạo không gian làm việc. Vui lòng thử lại!');
        console.error('Lỗi khi tạo workspace:', err);
      }
    });
  }
}
