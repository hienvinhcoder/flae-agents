import { Component, HostListener, OnInit, inject } from '@angular/core';

import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './ui/sidebar.component';
import { TopbarComponent } from './ui/topbar.component';
import { SyncStatusBannerComponent } from './ui/sync-status-banner.component';
import { WorkspaceStore } from '../../stores/workspace.store';
import { WorkspaceApiService } from '../../services/api/workspace-api.service';
import { AuthStore } from '../../stores/auth.store';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, SyncStatusBannerComponent],
  template: `
    <div class="flex h-screen w-full bg-app overflow-hidden text-text-body font-sans relative">
      <!-- Sidebar -->
      <app-sidebar 
        [currentPath]="currentPath" 
        [(collapsed)]="sidebarCollapsed"
        [isMobile]="isMobile">
      </app-sidebar>

      <!-- Main Layout -->
      <div class="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative bg-app">
        <!-- Topbar -->
        <app-topbar 
          [isMobile]="isMobile"
          [pageTitle]="pageTitle"
          (menuToggle)="toggleMobileMenu()">
        </app-topbar>
        
        <app-sync-status-banner [isSyncing]="workspaceStore.isSyncing()"></app-sync-status-banner>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-app scroll-smooth">
          <div class="max-w-[1440px] mx-auto w-full h-full">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private router = inject(Router);
  public workspaceStore = inject(WorkspaceStore);
  private workspaceApiService = inject(WorkspaceApiService);
  private authStore = inject(AuthStore);

  sidebarCollapsed = false;
  isMobile = false;
  currentPath = '';
  pageTitle = 'Dashboard';

  ngOnInit() {
    this.checkScreenSize();
    this.loadWorkspaces();
    
    // Track current route for sidebar active state and page title
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentPath = event.urlAfterRedirects;
      this.updatePageTitle();
    });
    
    // Initial check
    this.currentPath = this.router.url;
    this.updatePageTitle();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const width = window.innerWidth;
    const wasMobile = this.isMobile;
    this.isMobile = width < 768; // md breakpoint in tailwind
    
    if (this.isMobile && !wasMobile) {
      this.sidebarCollapsed = true;
    } else if (!this.isMobile && wasMobile) {
      this.sidebarCollapsed = false;
    }
  }

  toggleMobileMenu() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private updatePageTitle() {
    if (this.currentPath.includes('briefing')) this.pageTitle = 'Morning Briefing';
    else if (this.currentPath.includes('inbox')) this.pageTitle = 'Omnichannel Inbox';
    else if (this.currentPath.includes('agents')) this.pageTitle = 'My Agent Team';
    else if (this.currentPath.includes('chat')) this.pageTitle = 'AI Chat';
    else if (this.currentPath.includes('knowledge')) this.pageTitle = 'Knowledge Base';
    else if (this.currentPath.includes('reports')) this.pageTitle = 'Analyst Reports';
    else if (this.currentPath.includes('settings')) this.pageTitle = 'Settings';
    else this.pageTitle = 'Dashboard';
  }


  private loadWorkspaces() {
    this.workspaceStore.setIsSyncing(true);
    this.workspaceApiService.getWorkspaces().subscribe({
      next: (workspaces) => {
        this.workspaceStore.setWorkspaces(workspaces);
        this.workspaceStore.setIsSyncing(false);
        this.initializeDefaultWorkspace(workspaces);
      },
      error: (err) => {
        console.error('Lỗi khi lấy danh sách workspace:', err);
        this.workspaceStore.setIsSyncing(false);
      }
    });
  }

  private initializeDefaultWorkspace(workspaces: any[]) {
    if (workspaces.length === 0) {
      this.workspaceStore.setCurrentWorkspaceId(null);
      return;
    }

    // 1. Kiểm tra từ LocalStorage
    this.workspaceStore.loadCurrentWorkspaceIdFromStorage();
    let selectedId = this.workspaceStore.currentWorkspaceId();

    // Xác nhận xem id từ LocalStorage có tồn tại trong danh sách workspaces mới lấy về hay không
    const exists = workspaces.some(w => w.id === selectedId);

    if (!selectedId || !exists) {
      // 2. Nếu không có hoặc không hợp lệ, lấy từ profile User trong AuthStore
      const user = this.authStore.currentUser();
      if (user && user.current_workspace_id && workspaces.some(w => w.id === user.current_workspace_id)) {
        selectedId = user.current_workspace_id;
      } else {
        // 3. Nếu không có nữa, lấy cái đầu tiên
        selectedId = workspaces[0].id;
      }
    }

    if (selectedId) {
      this.workspaceStore.setCurrentWorkspaceId(selectedId);
      
      // Đồng bộ workspace này lên database của User nếu DB chưa có hoặc khác
      const user = this.authStore.currentUser();
      if (user && user.current_workspace_id !== selectedId) {
        this.workspaceApiService.updateCurrentWorkspace(selectedId).subscribe({
          next: () => {
            // Cập nhật lại user profile local trong AuthStore
            const updatedUser = { ...user, current_workspace_id: selectedId };
            this.authStore.setCurrentUser(updatedUser);
          },
          error: (err) => {
            console.error('Lỗi khi tự động cập nhật workspace hoạt động hiện tại lên DB:', err);
          }
        });
      }
    }
  }
}
