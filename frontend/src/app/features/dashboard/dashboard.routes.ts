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
        loadChildren: () => import('./pages/knowledge/knowledge.routes').then(m => m.KNOWLEDGE_ROUTES)
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/placeholder.component').then(m => m.PlaceholderComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
