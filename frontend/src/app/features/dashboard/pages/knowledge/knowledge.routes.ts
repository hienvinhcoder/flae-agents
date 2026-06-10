import { Routes } from '@angular/router';

export const KNOWLEDGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./knowledge-list/knowledge-list.component').then(m => m.KnowledgeListComponent)
  }
];
