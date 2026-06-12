import { Routes } from '@angular/router';

export const INVITE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./invite-accept.component').then(m => m.InviteAcceptComponent)
  }
];
