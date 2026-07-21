import { Routes } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  Plus, Trash2, MessageSquare, Bot, Sparkles,
  Database, User, ChevronUp, ChevronDown, ArrowLeft,
  RefreshCw, Send, FileText, Check
} from 'lucide-angular';

const CHAT_ICONS = {
  Plus, Trash2, MessageSquare, Bot, Sparkles,
  Database, User, ChevronUp, ChevronDown, ArrowLeft,
  RefreshCw, Send, FileText, Check
};

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    providers: [
      importProvidersFrom(LucideAngularModule.pick(CHAT_ICONS))
    ],
    loadComponent: () => import('./pages/chat-page/chat-page.component').then(m => m.ChatPageComponent)
  }
];

