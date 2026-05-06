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
    path: 'onboarding',
    canActivate: [authGuard],
    loadChildren: () => import('./features/onboarding/onboarding.routes').then(m => m.routes)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes)
  }
];
