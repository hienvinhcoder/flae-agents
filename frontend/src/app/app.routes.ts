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
    children: [
      {
        path: '',
        redirectTo: 'create-workspace',
        pathMatch: 'full'
      },
      {
        path: 'create-workspace',
        loadComponent: () => import('./features/onboarding/create-workspace.component').then(c => c.CreateWorkspaceComponent)
      },
      {
        path: 'accept-invite',
        loadComponent: () => import('./features/onboarding/accept-invite.component').then(c => c.AcceptInviteComponent)
      }
    ]
  }
];
