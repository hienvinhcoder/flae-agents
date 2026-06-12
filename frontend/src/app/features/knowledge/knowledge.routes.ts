import { Routes } from '@angular/router';

export const KNOWLEDGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/knowledge-list/knowledge-list.component').then(m => m.KnowledgeListComponent)
  },
  {
    path: 'graph',
    loadComponent: () => import('./pages/knowledge-graph/knowledge-graph.component').then(m => m.KnowledgeGraphComponent)
  }
];

