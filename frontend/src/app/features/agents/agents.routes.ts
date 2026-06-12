import { Routes } from '@angular/router';

export const AGENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./agents.component').then(m => m.AgentsComponent)
  }
];
