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
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'inbox',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'agents',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'knowledge',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      }
    ]
  }
];
