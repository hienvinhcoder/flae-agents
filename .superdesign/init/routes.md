# Routes — `frontend/src/app/router/router.tsx`

Lazy via `createLazyElement`. Protected routes wrap `RuntimeAppShell` under `/dashboard/*`.

| URL | Component | Notes |
|---|---|---|
| `/` | Navigate → `/auth/login` | Index redirect |
| `/auth/login` | `features/auth/pages/LoginPage` | Guest |
| `/auth/register` | `features/auth/pages/RegisterPage` | Guest |
| `/dashboard` | Navigate → `chat` | Shell layout |
| `/dashboard/chat` | `features/chat/pages/ChatPage` | Default home |
| `/dashboard/agents` | `features/agents/pages/AgentListPage` | |
| `/dashboard/agents/new` | `features/agents/pages/AgentConfigPage` | |
| `/dashboard/agents/:agentId/edit` | `features/agents/pages/AgentConfigPage` | |
| `/dashboard/agents/:agentId/chat` | `app/pages/AgentChatPage` | |
| `/dashboard/knowledge` | `features/knowledge/pages/KnowledgeListPage` | Company Memory library (demo target) |
| `/dashboard/knowledge/graph` | `features/knowledge/pages/KnowledgeGraphPage` | Memory graph |
| `/dashboard/topics` | `features/topics/pages/TopicListPage` | |
| `/dashboard/topics/:id` | `features/topics/pages/TopicDetailPage` | |
| `/dashboard/settings` | `features/settings/pages/SettingsPage` | |

Router source: `frontend/src/app/router/router.tsx`
