import type { ReactElement } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

import { RouteErrorBoundary } from '../errors/RouteErrorBoundary';
import { ProtectedRoute } from '../../core/auth/ProtectedRoute';
import { RequireAnonymousRoute } from '../../core/auth/GuestRoute';
import { createLazyElement } from './lazy-route';

const runtimeAppShell = createLazyElement(() => import('../layout/RuntimeAppShell').then(({ RuntimeAppShell }) => ({ default: RuntimeAppShell })));

export function createRouteObjects(appShell: ReactElement = runtimeAppShell): RouteObject[] {
  return [{
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate replace to="/auth/login" /> },
      {
        path: 'auth',
        element: <RequireAnonymousRoute />,
        children: [
          { index: true, element: <Navigate replace to="login" /> },
          { path: 'login', element: createLazyElement(() => import('../../features/auth/pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage }))) },
          { path: 'register', element: createLazyElement(() => import('../../features/auth/pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage }))) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'invite', element: createLazyElement(() => import('../../features/invite/pages/InviteAcceptPage').then(({ InviteAcceptPage }) => ({ default: InviteAcceptPage }))) },
          {
            path: 'dashboard',
            element: appShell,
            children: [
              { index: true, element: <Navigate replace to="chat" /> },
              { path: 'chat', element: createLazyElement(() => import('../../features/chat/pages/ChatPage').then(({ ChatPage }) => ({ default: ChatPage }))) },
              { path: 'agents', element: createLazyElement(() => import('../../features/agents/pages/AgentListPage').then(({ AgentListPage }) => ({ default: AgentListPage }))) },
              { path: 'agents/new', element: createLazyElement(() => import('../../features/agents/pages/AgentConfigPage').then(({ AgentConfigPage }) => ({ default: AgentConfigPage }))) },
              { path: 'agents/:agentId/edit', element: createLazyElement(() => import('../../features/agents/pages/AgentConfigPage').then(({ AgentConfigPage }) => ({ default: AgentConfigPage }))) },
              { path: 'agents/:agentId/chat', element: createLazyElement(() => import('../pages/AgentChatPage').then(({ AgentChatPage }) => ({ default: AgentChatPage }))) },
              { path: 'knowledge', element: createLazyElement(() => import('../../features/knowledge/pages/KnowledgeListPage').then(({ KnowledgeListPage }) => ({ default: KnowledgeListPage }))) },
              { path: 'knowledge/graph', element: createLazyElement(() => import('../../features/knowledge/pages/KnowledgeGraphPage').then(({ KnowledgeGraphPage }) => ({ default: KnowledgeGraphPage }))) },
              { path: 'topics', element: createLazyElement(() => import('../../features/topics/pages/TopicListPage').then(({ TopicListPage }) => ({ default: TopicListPage }))) },
              { path: 'topics/:id', element: createLazyElement(() => import('../../features/topics/pages/TopicDetailPage').then(({ TopicDetailPage }) => ({ default: TopicDetailPage }))) },
              { path: 'settings', element: createLazyElement(() => import('../../features/settings/pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage }))) },
            ],
          },
        ],
      },
    ],
  }];
}

export function createAppRouter() {
  return createBrowserRouter(createRouteObjects());
}
