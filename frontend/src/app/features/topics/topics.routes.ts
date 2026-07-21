import { Routes } from '@angular/router';

export const TOPICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/topic-list/topic-list.component').then(m => m.TopicListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/topic-detail/topic-detail.component').then(m => m.TopicDetailComponent)
  }
];
// Trigger rebuild for routes config
