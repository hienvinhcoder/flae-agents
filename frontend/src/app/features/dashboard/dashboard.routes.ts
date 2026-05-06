import { Routes } from '@angular/router';
import { AdminLayoutComponent } from '../../core/layout/admin-layout/admin-layout.component';

export const dashboardRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'briefing',
        pathMatch: 'full'
      },
      {
        path: 'briefing',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      // Placeholders for other routes mentioned in the PRD
      {
        path: 'inbox',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      {
        path: 'agents',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      {
        path: 'knowledge',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      {
        path: 'voice',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/briefing.component').then(m => m.BriefingComponent)
      }
    ]
  }
];
