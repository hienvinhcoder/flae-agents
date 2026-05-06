import { Component, HostListener, OnInit, inject } from '@angular/core';

import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex h-screen w-full bg-mint-white overflow-hidden text-dark-green font-sans relative">
      <!-- Sidebar -->
      <app-sidebar 
        [currentPath]="currentPath" 
        [(collapsed)]="sidebarCollapsed"
        [isMobile]="isMobile">
      </app-sidebar>

      <!-- Main Layout -->
      <div class="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
        <!-- Topbar -->
        <app-topbar 
          [isMobile]="isMobile"
          [pageTitle]="pageTitle"
          (menuToggle)="toggleMobileMenu()">
        </app-topbar>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div class="max-w-7xl mx-auto w-full h-full">
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

  sidebarCollapsed = false;
  isMobile = false;
  currentPath = '';
  pageTitle = 'Dashboard';

  ngOnInit() {
    this.checkScreenSize();
    
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
    else if (this.currentPath.includes('knowledge')) this.pageTitle = 'Knowledge Base';
    else if (this.currentPath.includes('reports')) this.pageTitle = 'Analyst Reports';
    else if (this.currentPath.includes('voice')) this.pageTitle = 'Voice Calls';
    else if (this.currentPath.includes('settings')) this.pageTitle = 'Settings';
    else this.pageTitle = 'Dashboard';
  }
}
