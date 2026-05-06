import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'create-workspace',
    pathMatch: 'full'
  },
  {
    path: 'create-workspace',
    loadComponent: () => import('./pages/onboarding-container.component').then(m => m.OnboardingContainerComponent)
  },
  {
    path: 'oauth-callback',
    loadComponent: () => import('./pages/oauth-callback.component').then(m => m.OauthCallbackComponent)
  },
  {
    path: 'accept-invite',
    loadComponent: () => import('./accept-invite.component').then(c => c.AcceptInviteComponent)
  }
];
