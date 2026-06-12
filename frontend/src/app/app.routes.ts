import { Routes } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { authGuard, requireNoAuthGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './core/layout/admin-layout/admin-layout.component';
import { DASHBOARD_LAYOUT_ICONS } from './core/layout/admin-layout/dashboard-icons';

/**
 * Icons cho Knowledge feature (lazy loaded khi vào /knowledge).
 */
import {
  Blocks, Tag, GitBranch, Timer, CircleAlert,
  UploadCloud, CloudUpload, FileText, Trash2,
  PencilLine, Upload, Search, FolderOpen, File,
  ChevronRight, CircleHelp, CircleCheck, FileCode,
  X, Check, RefreshCw,
  ArrowLeft, Database, Pause, Play,
  Clock, LoaderCircle,
} from 'lucide-angular';

const KNOWLEDGE_ICONS = {
  Blocks, Tag, GitBranch, Timer, CircleAlert,
  UploadCloud, CloudUpload, FileText, Trash2,
  PencilLine, Upload, Search, FolderOpen, File,
  ChevronRight, CircleHelp, CircleCheck, FileCode,
  X, Check, RefreshCw,
  ArrowLeft, Database, Pause, Play,
  Clock, LoaderCircle,
};

/**
 * Icons cho Settings feature.
 */
import {
  Sliders, Users, UserPlus, CircleX, Trash,
} from 'lucide-angular';

const SETTINGS_ICONS = { Sliders, Users, UserPlus, X, CircleX, Trash };

/**
 * Icons cho Invite Accept page.
 */
const INVITE_ICONS = { CircleCheck };

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
    path: 'invite',
    canActivate: [authGuard],
    providers: [
      importProvidersFrom(LucideAngularModule.pick(INVITE_ICONS)),
    ],
    loadChildren: () => import('./features/invite/invite.routes').then(m => m.INVITE_ROUTES)
  },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    providers: [
      importProvidersFrom(LucideAngularModule.pick(DASHBOARD_LAYOUT_ICONS)),
    ],
    children: [
      {
        path: '',
        redirectTo: 'briefing',
        pathMatch: 'full'
      },
      {
        path: 'briefing',
        loadChildren: () => import('./features/briefing/briefing.routes').then(m => m.BRIEFING_ROUTES)
      },
      {
        path: 'inbox',
        loadChildren: () => import('./features/inbox/inbox.routes').then(m => m.INBOX_ROUTES)
      },
      {
        path: 'agents',
        loadChildren: () => import('./features/agents/agents.routes').then(m => m.AGENTS_ROUTES)
      },
      {
        path: 'knowledge',
        providers: [
          importProvidersFrom(LucideAngularModule.pick(KNOWLEDGE_ICONS)),
        ],
        loadChildren: () => import('./features/knowledge/knowledge.routes').then(m => m.KNOWLEDGE_ROUTES)
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES)
      },
      {
        path: 'settings',
        providers: [
          importProvidersFrom(LucideAngularModule.pick(SETTINGS_ICONS)),
        ],
        loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      }
    ]
  }
];
