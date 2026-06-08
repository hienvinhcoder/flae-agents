import { Routes } from '@angular/router';
import { authGuard, requireNoAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
    canActivate: [requireNoAuthGuard]
  },
  {
    path: 'invite',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/pages/invite-accept/invite-accept.component').then(m => m.InviteAcceptComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  }
];
