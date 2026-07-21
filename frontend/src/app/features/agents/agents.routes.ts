import { Routes } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import {
  Plus, PencilLine, Trash2, MessageSquare,
  Bot, Brain, Sparkles, Database, Terminal,
  Briefcase, User, ChevronRight, ChevronUp,
  ChevronDown, ArrowLeft, RefreshCw, Send,
  FileText, Check
} from 'lucide-angular';

const AGENT_ICONS = {
  Plus, PencilLine, Trash2, MessageSquare,
  Bot, Brain, Sparkles, Database, Terminal,
  Briefcase, User, ChevronRight, ChevronUp,
  ChevronDown, ArrowLeft, RefreshCw, Send,
  FileText, Check
};

export const AGENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      importProvidersFrom(LucideAngularModule.pick(AGENT_ICONS))
    ],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/agent-list/agent-list.component').then(m => m.AgentListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/agent-config/agent-config.component').then(m => m.AgentConfigComponent)
      },
      {
        path: ':agentId/edit',
        loadComponent: () => import('./pages/agent-config/agent-config.component').then(m => m.AgentConfigComponent)
      },
      {
        path: ':agentId/chat',
        loadComponent: () => import('./pages/agent-chat/agent-chat.component').then(m => m.AgentChatComponent)
      }
    ]
  }
];
