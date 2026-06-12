import { Routes } from '@angular/router';

export const BRIEFING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./briefing.component').then(m => m.BriefingComponent)
  }
];
