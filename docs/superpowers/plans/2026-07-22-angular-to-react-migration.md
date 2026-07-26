# Angular to React Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Angular frontend with a redesigned React SPA while preserving routes, backend contracts, Firebase authentication, workspace behavior, i18n, and realtime features, and update `flae-code` so React becomes the enforced frontend standard.

**Architecture:** Build the replacement under `frontend-react/` and keep `frontend/` read-only as the behavioral reference. Use React Router for lazy routes, TanStack Query for server state, Zustand for shared client state, a typed fetch client for FastAPI, and feature-owned modules. Cut over only after the parity matrix, automated tests, coverage, and production build pass.

**Tech Stack:** React, Vite, TypeScript strict, React Router, TanStack Query, Zustand, Firebase Web SDK, React Hook Form, Zod, Tailwind CSS 4, react-i18next, lucide-react, Vitest, React Testing Library, MSW, Playwright, axe-core.

---

## Program boundaries

- Work on a dedicated `codex/angular-to-react-migration` branch or isolated worktree.
- Do not add product features during migration; only reproduce current behaviors and the approved UI redesign.
- Do not import Angular code into React. Port contracts and behavior, not framework implementation.
- Complete tasks in order. Tasks 1-6 establish contracts and platform; Tasks 7-13 migrate product domains; Tasks 14-16 verify and cut over.
- Commit after every task. Do not combine cutover with feature development.

## Target file map

```text
frontend-react/
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json
├── index.html
├── public/assets/i18n/{en,vi}.json
├── src/
│   ├── app/{main.tsx,providers/AppProviders.tsx,router/router.tsx}
│   ├── core/
│   │   ├── api/{client.ts,errors.ts,types.ts}
│   │   ├── auth/{firebase.ts,AuthBootstrap.tsx,ProtectedRoute.tsx}
│   │   ├── config/env.ts
│   │   ├── realtime/{sse.ts,websocket.ts}
│   │   └── stores/{auth-store.ts,workspace-store.ts}
│   ├── shared/{i18n/index.ts,lib/query-keys.ts,ui/*}
│   └── features/{auth,invite,briefing,inbox,chat,agents,knowledge,topics,reports,settings}/
└── tests/{setup.ts,mocks/server.ts,e2e/*}
```

The final cutover moves this tree to `frontend/`; all paths in Tasks 2-14 use `frontend-react/`, while Tasks 15-16 use the final `frontend/` path.

### Task 1: Freeze the Angular behavior contract

**Files:**
- Create: `docs/migrations/angular-to-react/route-parity.md`
- Create: `docs/migrations/angular-to-react/api-contracts.md`
- Create: `docs/migrations/angular-to-react/acceptance-checklist.md`
- Read: `frontend/src/app/app.routes.ts`
- Read: `frontend/src/app/features/*/*.routes.ts`
- Read: `frontend/src/app/core/services/api/*.ts`
- Read: `frontend/src/app/features/*/services/*.ts`

- [ ] **Step 1: Record every public route and redirect**

Write a route table containing `/`, `/auth/login`, `/auth/register`, `/invite`, every `/dashboard/*` route, `/dashboard/agents/new`, `/dashboard/agents/:agentId/edit`, `/dashboard/agents/:agentId/chat`, `/dashboard/knowledge/graph`, and `/dashboard/topics/:id`. For each route record auth requirement, Angular source component, React target page, loading state, empty state, error state, and acceptance-test ID.

- [ ] **Step 2: Record API contracts**

Document method, URL, authorization header, `X-Workspace-ID`, payload, response type, and error states for auth sync, workspace CRUD/membership/invitations/OAuth, knowledge CRUD/ingestion/graph, topics, agents, sessions, messages, default agent, and chat stream. Mark the current `any` responses for ingestion status, topic update, workspace selection, and streaming events as required typed-contract work.

- [ ] **Step 3: Record behavior acceptance tests**

Use stable IDs such as `AUTH-01 restores Firebase session`, `WS-03 rejects an expired invite`, `KB-05 retries failed ingestion`, `TOPIC-04 merges selected topics`, `AGENT-06 cancels an active stream`, and `GRAPH-04 clears selection when filters hide a node`.

- [ ] **Step 4: Verify inventory completeness**

Run:

```bash
rg -n "path:\\s*'|redirectTo:" frontend/src/app --glob '*routes.ts' --glob 'app.routes.ts'
rg -n "http\\.(get|post|put|delete)|new EventSource" frontend/src/app --glob '*.ts'
```

Expected: every match maps to one row in the route or API document.

- [ ] **Step 5: Commit**

```bash
git add docs/migrations/angular-to-react
git commit -m "docs: freeze Angular frontend behavior contracts"
```

### Task 2: Scaffold a testable React SPA

**Files:**
- Create: `frontend-react/package.json`
- Create: `frontend-react/package-lock.json`
- Create: `frontend-react/index.html`
- Create: `frontend-react/tsconfig.json`
- Create: `frontend-react/vite.config.ts`
- Create: `frontend-react/vitest.config.ts`
- Create: `frontend-react/src/app/main.tsx`
- Create: `frontend-react/src/app/App.tsx`
- Create: `frontend-react/src/app/App.test.tsx`
- Create: `frontend-react/tests/setup.ts`

- [ ] **Step 1: Scaffold and install locked dependencies**

```bash
npm create vite@latest frontend-react -- --template react-ts
cd frontend-react
npm install react-router-dom @tanstack/react-query @tanstack/react-query-devtools zustand firebase react-hook-form zod @hookform/resolvers i18next react-i18next lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw eslint prettier playwright @playwright/test axe-core @axe-core/playwright
```

Expected: `package-lock.json` exists and `npm audit --omit=dev` reports no unresolved critical vulnerability.

- [ ] **Step 2: Add deterministic scripts**

Set `package.json` scripts to:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build": "tsc -b && vite build",
  "preview": "vite preview --host 0.0.0.0",
  "typecheck": "tsc -b --pretty false",
  "lint": "eslint . --max-warnings=0",
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test"
}
```

Configure Vite with `server.port = 4200`, `server.strictPort = true`, and `preview.port = 4200` so existing local URLs and `stop.sh` remain valid.

- [ ] **Step 3: Write the failing application test**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('renders the application bootstrap', () => {
  render(<App />);
  expect(screen.getByRole('main', { name: /flae application/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run it and confirm failure**

Run: `cd frontend-react && npm test -- src/app/App.test.tsx`

Expected: FAIL because `App` does not yet render the named main landmark.

- [ ] **Step 5: Implement the minimal bootstrap**

```tsx
export function App() {
  return <main aria-label="FLAE application" />;
}
```

- [ ] **Step 6: Verify platform gates**

```bash
cd frontend-react
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands exit 0 and `dist/index.html` exists.

- [ ] **Step 7: Commit**

```bash
git add frontend-react
git commit -m "build: scaffold React frontend"
```

### Task 3: Update design tokens and add temporary React migration rules

**Files:**
- Modify: `DESIGN.md`
- Modify: `.agents/rules/flae-code.md`
- Create: `frontend-react/src/styles.css`
- Create: `frontend-react/src/shared/ui/theme.test.tsx`

- [ ] **Step 1: Replace the design-system contract**

Keep these immutable CSS variables and document redesigned neutral, type, spacing, radius, motion, focus, and responsive rules in `DESIGN.md`:

```css
:root {
  --color-primary: #f28c45;
  --color-primary-hover: #e77e37;
  --color-primary-active: #d96f26;
  --color-primary-soft: rgba(242, 140, 69, 0.1);
}
```

- [ ] **Step 2: Replace Angular-specific rules**

In `.agents/rules/flae-code.md`, change the frontend stack to React/Vite and replace Section 3.2 with rules for feature folders, functional components, typed props, React Router lazy routes, TanStack Query server state, Zustand client state, React Hook Form plus Zod, typed API functions, effect cleanup, accessibility, and Vitest/RTL/Playwright. Add a temporary migration subsection stating:

```text
frontend/ is reference-only Angular.
frontend-react/ is the active React implementation.
No runtime imports are allowed between them.
A feature is migrated only when its acceptance tests pass.
```

- [ ] **Step 3: Add a token regression test**

Test that a primary button renders `var(--color-primary)` and that no shared component contains a literal primary hex value. Run:

```bash
cd frontend-react && npm test -- src/shared/ui/theme.test.tsx
rg -n "#f28c45|#e77e37|#d96f26" src --glob '*.{ts,tsx}'
```

Expected: test passes; `rg` has no matches outside `src/styles.css`.

- [ ] **Step 4: Verify rules no longer prescribe Angular for new code**

Run: `rg -n "Angular Signals|LucideAngular|loadChildren|input\\(\\)|output\\(\\)" .agents/rules/flae-code.md`

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md .agents/rules/flae-code.md frontend-react/src/styles.css frontend-react/src/shared/ui/theme.test.tsx
git commit -m "docs: define React frontend development rules"
```

### Task 4: Build typed configuration, API, query, and error foundations

**Files:**
- Create: `frontend-react/src/core/config/env.ts`
- Create: `frontend-react/src/core/api/types.ts`
- Create: `frontend-react/src/core/api/errors.ts`
- Create: `frontend-react/src/core/api/client.ts`
- Create: `frontend-react/src/core/api/client.test.ts`
- Create: `frontend-react/src/shared/lib/query-keys.ts`
- Create: `frontend-react/src/app/providers/AppProviders.tsx`
- Create: `frontend-react/.env.example`

- [ ] **Step 1: Define environment validation**

Use Zod to require `VITE_API_URL`, `VITE_WS_URL`, and all `VITE_FIREBASE_*` fields. Export an immutable `env` object and fail fast with a readable list of missing keys. Store Firebase public configuration in Vite environment variables, never backend secrets.

- [ ] **Step 2: Define shared types**

```ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type AppErrorKind = 'auth' | 'validation' | 'network' | 'server' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  status?: number;
  retryable: boolean;
}
```

- [ ] **Step 3: Test the HTTP client before implementation**

Add tests proving it attaches `Authorization: Bearer token` and `X-Workspace-ID`, unwraps `ApiResponse<T>`, normalizes offline errors, retries one `401` after token refresh, and does not retry a second `401`.

- [ ] **Step 4: Implement `apiClient.request<T>()`**

The client accepts `path`, `method`, `body`, `workspaceId`, `signal`, and `auth`; obtains the token through an injected async token provider; parses JSON once; and throws `AppError`. Do not expose raw `Response` to features.

- [ ] **Step 5: Define stable query keys**

```ts
export const queryKeys = {
  workspaces: ['workspaces'] as const,
  knowledge: (workspaceId: string) => ['workspaces', workspaceId, 'knowledge'] as const,
  topics: (workspaceId: string) => ['workspaces', workspaceId, 'topics'] as const,
  agents: (workspaceId: string) => ['workspaces', workspaceId, 'agents'] as const,
};
```

- [ ] **Step 6: Verify and commit**

```bash
cd frontend-react && npm run typecheck && npm test -- src/core/api/client.test.ts && npm run build
cd .. && git add frontend-react && git commit -m "feat: add typed React API foundation"
```

### Task 5: Implement Firebase authentication and protected routing

**Files:**
- Create: `frontend-react/src/core/auth/firebase.ts`
- Create: `frontend-react/src/core/auth/AuthBootstrap.tsx`
- Create: `frontend-react/src/core/auth/ProtectedRoute.tsx`
- Create: `frontend-react/src/core/stores/auth-store.ts`
- Create: `frontend-react/src/features/auth/api/auth-api.ts`
- Create: `frontend-react/src/features/auth/pages/{LoginPage,RegisterPage}.tsx`
- Create: `frontend-react/src/features/auth/schemas/auth-schema.ts`
- Create: `frontend-react/src/core/auth/AuthBootstrap.test.tsx`
- Create: `frontend-react/src/features/auth/pages/LoginPage.test.tsx`

- [ ] **Step 1: Port and tighten auth types**

Define `User`, `SyncUserPayload`, and `LoginProvider` from `frontend/src/app/core/models/auth.model.ts`, preserving backend field names such as `firebase_uid`, `full_name`, and `avatar_url`.

- [ ] **Step 2: Write auth lifecycle tests**

Cover no session, restored session plus successful sync, failed sync without false authenticated render, Google popup success, email login failure, logout, and protected-route return URL.

- [ ] **Step 3: Implement auth initialization**

`AuthBootstrap` waits for `authStateReady()`, handles `getRedirectResult()`, calls `syncUser`, sets `{status: 'initializing' | 'anonymous' | 'syncing' | 'authenticated'}`, and subscribes once to `onAuthStateChanged`. Its cleanup unsubscribes the Firebase listener.

- [ ] **Step 4: Implement forms and route guard**

Use React Hook Form with Zod email/password schemas. `ProtectedRoute` renders a skeleton while initializing, redirects anonymous users to `/auth/login?returnUrl=...`, and renders `<Outlet />` only when authenticated.

- [ ] **Step 5: Verify and commit**

```bash
cd frontend-react
npm run typecheck
npm test -- src/core/auth src/features/auth
npm run build
cd ..
git add frontend-react
git commit -m "feat: migrate Firebase authentication to React"
```

### Task 6: Implement the React design system, app shell, workspace, and i18n

**Files:**
- Create: `frontend-react/src/shared/ui/{Button,Input,Select,Dialog,Toast,Table,Tabs,Skeleton,ErrorState}.tsx`
- Create: `frontend-react/src/shared/ui/*.test.tsx`
- Create: `frontend-react/src/app/router/router.tsx`
- Create: `frontend-react/src/app/layout/AppShell.tsx`
- Create: `frontend-react/src/core/stores/workspace-store.ts`
- Create: `frontend-react/src/features/settings/api/workspace-api.ts`
- Create: `frontend-react/src/features/settings/hooks/use-workspaces.ts`
- Create: `frontend-react/src/shared/i18n/index.ts`
- Copy: `frontend/public/assets/i18n/{en,vi}.json` to `frontend-react/public/assets/i18n/`

- [ ] **Step 1: Test shared UI contracts**

Cover button loading/disabled behavior, input label/error association, dialog focus trap and Escape close, toast live region, table empty state, tabs keyboard navigation, and reduced-motion behavior.

- [ ] **Step 2: Implement shared primitives**

All components accept typed props, forward refs where focus is required, use semantic roles, and reference CSS tokens. Shared UI cannot import from `features/`, `core/stores/`, or `core/api/`.

- [ ] **Step 3: Implement workspace state and queries**

Persist only `currentWorkspaceId`. After workspace queries load, keep the saved ID only if it exists; otherwise select the first accessible workspace or `null`. On workspace change, cancel active feature queries and let workspace-scoped keys load new data.

- [ ] **Step 4: Implement router and shell**

Define lazy route modules matching the parity matrix. Build responsive navigation, workspace selector, topbar, toast viewport, connection dialog, root error boundary, route suspense fallback, and `/dashboard` to `/dashboard/briefing` redirect.

- [ ] **Step 5: Initialize i18n**

Load `en.json` and `vi.json`, persist the selected language, and fall back to Vietnamese. Add a test proving an unknown key does not render as an empty string.

- [ ] **Step 6: Verify and commit**

```bash
cd frontend-react && npm run typecheck && npm test && npm run build
cd .. && git add frontend-react && git commit -m "feat: add React app shell and design system"
```

### Task 7: Migrate invite, briefing, inbox, reports, and settings

**Files:**
- Create: `frontend-react/src/features/invite/{api,schemas,pages,ui}/*`
- Create: `frontend-react/src/features/briefing/pages/BriefingPage.tsx`
- Create: `frontend-react/src/features/inbox/pages/InboxPage.tsx`
- Create: `frontend-react/src/features/reports/pages/ReportsPage.tsx`
- Create: `frontend-react/src/features/settings/{api,hooks,pages,schemas,ui}/*`
- Test: `frontend-react/src/features/{invite,briefing,inbox,reports,settings}/**/*.test.tsx`

- [ ] **Step 1: Write feature acceptance tests**

Cover invite token validation/acceptance/error, settings tab routing, workspace rename, member/invitation lists, invite-member validation, role update, member removal confirmation, and loading/empty/error states. Briefing, inbox, and reports must render their current information architecture or an explicit non-interactive empty state where the Angular page is currently a stub.

- [ ] **Step 2: Port typed API functions and Zod schemas**

Implement all methods currently in `workspace-api.service.ts`, preserving payload and response field names. Parse invite and settings forms with Zod before mutation.

- [ ] **Step 3: Implement pages and invalidate exact query keys**

Workspace rename invalidates `workspaces`; membership mutations invalidate `['workspaces', id, 'members']`; invitation mutations invalidate `['workspaces', id, 'invitations']`. Destructive actions require confirmation and expose a retryable error state.

- [ ] **Step 4: Verify routes and commit**

```bash
cd frontend-react && npm test -- src/features/invite src/features/settings src/features/briefing src/features/inbox src/features/reports && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate workspace and supporting features"
```

### Task 8: Migrate knowledge document management

**Files:**
- Create: `frontend-react/src/features/knowledge/types/knowledge.ts`
- Create: `frontend-react/src/features/knowledge/api/knowledge-api.ts`
- Create: `frontend-react/src/features/knowledge/hooks/use-knowledge.ts`
- Create: `frontend-react/src/features/knowledge/schemas/knowledge-schema.ts`
- Create: `frontend-react/src/features/knowledge/pages/KnowledgeListPage.tsx`
- Create: `frontend-react/src/features/knowledge/ui/{DocumentTable,DocumentDetailPanel,UploadDialog,TextInputDialog,IngestionProgress,StatusBadge}.tsx`
- Test: `frontend-react/src/features/knowledge/**/*.test.tsx`

- [ ] **Step 1: Define typed contracts**

Port `DocumentStatus`, `DocumentType`, `KnowledgeDocument`, and `ManualDocumentPayload`. Replace ingestion `any` with the backend contract:

```ts
export interface IngestionStatus {
  document_id: string;
  status: DocumentStatus;
  error_message: string | null;
  chunk_count: number | null;
  entity_count: number | null;
  relation_count: number | null;
  processing_time_seconds: number | null;
}
```

- [ ] **Step 2: Write failing document workflow tests**

Cover list, search/filter, detail selection, upload metadata validation, multipart request, manual text validation, polling only for pending/processing documents, retry failed ingestion, delete confirmation, and polling cleanup on unmount/workspace change.

- [ ] **Step 3: Implement API, hooks, and UI**

Use query keys scoped by workspace. Stop polling for completed/failed states. After upload/manual/retry/delete, invalidate the document list and update the selected document consistently.

- [ ] **Step 4: Verify and commit**

```bash
cd frontend-react && npm test -- src/features/knowledge && npm run typecheck && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate knowledge management to React"
```

### Task 9: Migrate topics

**Files:**
- Create: `frontend-react/src/features/topics/types/topic.ts`
- Create: `frontend-react/src/features/topics/api/topics-api.ts`
- Create: `frontend-react/src/features/topics/hooks/use-topics.ts`
- Create: `frontend-react/src/features/topics/pages/{TopicListPage,TopicDetailPage}.tsx`
- Create: `frontend-react/src/features/topics/ui/{TopicCard,TopicMergeDialog}.tsx`
- Test: `frontend-react/src/features/topics/**/*.test.tsx`

- [ ] **Step 1: Port and correct topic contracts**

Define typed update responses instead of `Observable<any>`. Preserve list query parameters `query`, `status`, `limit`, and `offset`, and detail lookup by ID or slug.

- [ ] **Step 2: Write failing topic tests**

Cover debounced search, status filter, pagination, detail loading, inline edit, re-summarize, archive/update, merge validation requiring a target and sources, successful merge invalidation, and route navigation.

- [ ] **Step 3: Implement topic feature**

Use workspace-scoped query keys. Cancel stale searches, disable conflicting mutations, and make merge errors recoverable without losing selection.

- [ ] **Step 4: Verify and commit**

```bash
cd frontend-react && npm test -- src/features/topics && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate topics to React"
```

### Task 10: Migrate agents and session management

**Files:**
- Create: `frontend-react/src/features/agents/types/agent.ts`
- Create: `frontend-react/src/features/agents/api/agents-api.ts`
- Create: `frontend-react/src/features/agents/hooks/{use-agents,use-sessions}.ts`
- Create: `frontend-react/src/features/agents/schemas/agent-schema.ts`
- Create: `frontend-react/src/features/agents/pages/{AgentListPage,AgentConfigPage,AgentChatPage}.tsx`
- Create: `frontend-react/src/features/agents/ui/{AgentCard,ChatMessage,CitationList}.tsx`
- Test: `frontend-react/src/features/agents/**/*.test.tsx`

- [ ] **Step 1: Port agent/session/message types and routes**

Preserve `/dashboard/agents`, `/new`, `/:agentId/edit`, and `/:agentId/chat`. Keep backend field names from `agent.model.ts` and add discriminated stream-event types in Task 11.

- [ ] **Step 2: Write failing CRUD and session tests**

Cover list, create, edit, delete confirmation, missing agent, session list/create/delete, message history, citation rendering, workspace switching, and mutation error recovery.

- [ ] **Step 3: Implement CRUD, form, and session UI**

Use React Hook Form and Zod for agent configuration. Invalidate agent detail/list after create/update/delete and session list after session mutations. Keep the chat page non-streaming until Task 11.

- [ ] **Step 4: Verify and commit**

```bash
cd frontend-react && npm test -- src/features/agents && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate agent management to React"
```

### Task 11: Implement secure SSE chat and default chat

**Files:**
- Create: `frontend-react/src/core/realtime/sse.ts`
- Create: `frontend-react/src/core/realtime/sse.test.ts`
- Create: `frontend-react/src/features/chat/types/stream.ts`
- Create: `frontend-react/src/features/chat/api/chat-api.ts`
- Create: `frontend-react/src/features/chat/hooks/use-chat-stream.ts`
- Create: `frontend-react/src/features/chat/pages/ChatPage.tsx`
- Modify: `frontend-react/src/features/agents/pages/AgentChatPage.tsx`
- Test: `frontend-react/src/features/chat/**/*.test.tsx`

- [ ] **Step 1: Define stream events and state**

```ts
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'failed';
export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'citation'; citation: { document_id: string; title: string; chunk?: string } }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

- [ ] **Step 2: Test cancellation and credential handling**

Prove the streaming client sends `Authorization: Bearer <token>`, never adds `token=` to the URL, parses split SSE frames, transitions through the state machine, aborts on unmount/new message/workspace change, and exposes retry after failure.

- [ ] **Step 3: Implement fetch-based SSE**

Use `fetch` plus `ReadableStream` so headers are supported by existing `verify_token_stream`. Keep the message query parameter until the backend accepts a request body; do not place the Firebase token in the query string. Parse `data:` frames and close on `done` or `error`.

- [ ] **Step 4: Connect agent and default chat pages**

Load the default agent from `/workspaces/{workspaceId}/agents/default`. Append tokens to one assistant message, deduplicate citations, disable duplicate submit while connecting/streaming, and expose stop/retry actions.

- [ ] **Step 5: Verify and commit**

```bash
cd frontend-react && npm test -- src/core/realtime src/features/chat src/features/agents && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate realtime chat streaming"
```

### Task 12: Migrate the knowledge graph as bounded components

**Files:**
- Create: `frontend-react/src/features/knowledge/graph/types.ts`
- Create: `frontend-react/src/features/knowledge/graph/graph-adapter.ts`
- Create: `frontend-react/src/features/knowledge/graph/graph-adapter.test.ts`
- Create: `frontend-react/src/features/knowledge/graph/hooks/use-graph-controller.ts`
- Create: `frontend-react/src/features/knowledge/graph/ui/{GraphCanvas,GraphToolbar,GraphFilters,GraphSelectionPanel}.tsx`
- Create: `frontend-react/src/features/knowledge/pages/KnowledgeGraphPage.tsx`
- Test: `frontend-react/src/features/knowledge/graph/**/*.test.tsx`

- [ ] **Step 1: Freeze graph interaction cases**

From the Angular component, record node/edge mapping, colors by type/status, zoom/reset, search, filters, selection, detail navigation, empty graph, resize, and cleanup. Map each to `GRAPH-*` acceptance IDs.

- [ ] **Step 2: Write pure adapter tests**

Test unknown node types, dangling edges, duplicate IDs, empty input, deterministic labels, filter combinations, and selected-node removal. The adapter returns renderer-ready nodes/edges without DOM access.

- [ ] **Step 3: Implement bounded graph units**

`GraphCanvas` owns renderer lifecycle only; `GraphToolbar` emits zoom/reset/search actions; `GraphFilters` owns typed filter controls; `GraphSelectionPanel` renders details/navigation; `useGraphController` composes state. No file may exceed 450 lines.

- [ ] **Step 4: Test lifecycle cleanup**

Prove resize observers, event listeners, animation frames, and graph-renderer instances are released on unmount and workspace changes.

- [ ] **Step 5: Verify and commit**

```bash
cd frontend-react && npm test -- src/features/knowledge/graph && npm run typecheck && npm run build
cd .. && git add frontend-react && git commit -m "feat: migrate knowledge graph to React"
```

### Task 13: Complete WebSocket, connection recovery, and global failures

**Files:**
- Create: `frontend-react/src/core/realtime/websocket.ts`
- Create: `frontend-react/src/core/realtime/websocket.test.ts`
- Create: `frontend-react/src/app/errors/RouteErrorBoundary.tsx`
- Create: `frontend-react/src/app/errors/ConnectionDialog.tsx`
- Test: `frontend-react/src/app/errors/*.test.tsx`

- [ ] **Step 1: Write connection manager tests**

Cover one active socket per scope, cleanup, bounded exponential retry, no retry after auth failure, reconnect after online event, and no duplicate listeners.

- [ ] **Step 2: Implement only currently required realtime behavior**

Keep the manager dormant until a feature requests a connection. Do not invent new WebSocket product behavior; the Angular service is only a skeleton.

- [ ] **Step 3: Implement global failure UX**

Network failures open a retryable connection dialog; route render failures show a safe error page; authenticated `401` exhaustion clears Firebase/session/query/workspace state. UI and logs must not expose PII or raw stack traces.

- [ ] **Step 4: Verify and commit**

```bash
cd frontend-react && npm test -- src/core/realtime src/app/errors && npm run build
cd .. && git add frontend-react && git commit -m "feat: add React connection recovery"
```

### Task 14: Add E2E, accessibility, coverage, and parity gates

**Files:**
- Create: `frontend-react/playwright.config.ts`
- Create: `frontend-react/tests/e2e/{auth,workspace,knowledge,topics,agents,chat,graph}.spec.ts`
- Create: `frontend-react/tests/e2e/fixtures.ts`
- Modify: `frontend-react/vitest.config.ts`
- Modify: `docs/migrations/angular-to-react/route-parity.md`
- Modify: `docs/migrations/angular-to-react/acceptance-checklist.md`

- [ ] **Step 1: Configure deterministic test data**

Use Playwright fixtures and API/mock setup with fixed IDs. Do not depend on production Firebase accounts or mutable shared data. Keep one optional environment-gated smoke suite for a real development backend.

- [ ] **Step 2: Implement critical E2E flows**

Cover auth restore/login/logout, protected redirects, workspace selection/invite, knowledge upload/retry/delete, topic merge/archive, agent create/edit, streaming stop/retry/citation, and graph filter/select/navigation.

- [ ] **Step 3: Add accessibility checks**

Run axe on auth, dashboard shell, knowledge list, settings dialog, chat, and graph pages; also test keyboard-only navigation and focus restoration after dialogs.

- [ ] **Step 4: Enforce coverage and file size**

Set Vitest statement and branch thresholds to 75. Add a CI script that fails when a source file exceeds 450 lines, excluding generated files and type declarations.

- [ ] **Step 5: Close the parity matrix**

Every route and acceptance ID must link to a passing automated test or a documented manual visual check. No row may remain undecided.

- [ ] **Step 6: Verify and commit**

```bash
cd frontend-react
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run test:e2e
cd ..
git add frontend-react docs/migrations/angular-to-react
git commit -m "test: enforce React migration parity gates"
```

### Task 15: Prepare and execute repository cutover

**Files:**
- Modify: `start.sh`
- Modify: `run_frontend_tests.sh`
- Modify: `.github/workflows/test.yml`
- Modify: `docker-compose.yml`
- Replace: `frontend/` with reviewed `frontend-react/`
- Modify: `frontend/Dockerfile`
- Modify: `frontend/README.md`
- Remove: Angular source, `angular.json`, Angular tsconfig settings, Karma/Jasmine configuration, and Angular packages.

- [ ] **Step 1: Create a rollback point and verify a clean tree**

```bash
git status --short
git tag angular-frontend-before-react-cutover
```

Expected: status is clean before the tag is created.

- [ ] **Step 2: Replace the frontend tree with Git-aware moves**

Move the reviewed React tree to `frontend/` in one dedicated commit. Preserve assets and only remove Angular after all Task 14 gates pass:

```bash
git mv frontend frontend-angular-cutover
git mv frontend-react frontend
git rm -r frontend-angular-cutover
```

Confirm `package.json` contains no package whose name starts with `@angular/`, `lucide-angular`, `zone.js`, Jasmine, or Karma. The pre-cutover tag retains the deleted tree.

- [ ] **Step 3: Update local and container commands**

`start.sh` runs `docker compose up -d`, then `npm run dev`, and advertises port 4200. `run_frontend_tests.sh` runs `npm run typecheck`, `npm run lint`, and `npm run test:coverage`. The Dockerfile uses `npm ci` and `npm run dev -- --host 0.0.0.0` for development. Remove the unused `frontend_node_modules` named volume from `docker-compose.yml`. Document `npm run build` plus static `dist/` hosting as the production deployment contract.

- [ ] **Step 4: Update CI**

The frontend job runs Node setup, `npm ci`, typecheck, lint, coverage, build, and E2E smoke. Remove ChromeHeadless/Karma arguments.

- [ ] **Step 5: Verify no Angular runtime remains**

```bash
rg -n "@angular/|lucide-angular|zone.js|ng serve|ng build|Karma|Jasmine" frontend start.sh stop.sh run_frontend_tests.sh docker-compose.yml .github/workflows/test.yml
npm --prefix frontend ci
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:coverage
npm --prefix frontend run build
```

Expected: `rg` has no matches and every npm command exits 0.

- [ ] **Step 6: Commit cutover**

```bash
git add -A frontend start.sh run_frontend_tests.sh docker-compose.yml .github/workflows/test.yml
git commit -m "refactor: replace Angular frontend with React"
```

### Task 16: Finalize `flae-code`, docs, and release verification

**Files:**
- Modify: `.agents/rules/flae-code.md`
- Modify: `DESIGN.md`
- Modify: `frontend/README.md`
- Modify: `README.md`
- Modify: `repo_map.txt`
- Modify: `docs/migrations/angular-to-react/acceptance-checklist.md`
- Modify: `docs/specs/default_chat_spec.md`
- Modify: `docs/specs/qa_agent_spec.md`
- Modify: `docs/features/topics/SPEC.md`
- Modify: `docs/features/topics/PLAN.md`

- [ ] **Step 1: Remove temporary migration rules**

Delete references to `frontend-react/`, reference-only Angular, coexistence, and migration status. The permanent rule must identify `frontend/` as React/Vite and retain feature boundaries, state ownership, typed API, effect cleanup, accessibility, test, coverage, and 450-line requirements.

- [ ] **Step 2: Update active documentation**

Replace Angular CLI commands, Angular Signals, Angular Router, RxJS component-state guidance, and Karma instructions in `README.md` and `frontend/README.md`. Regenerate `repo_map.txt` from the final tree. Add a header to `docs/specs/default_chat_spec.md`, `docs/specs/qa_agent_spec.md`, `docs/features/topics/SPEC.md`, and `docs/features/topics/PLAN.md` stating that their Angular implementation notes are historical and superseded by the React migration design while their product requirements remain valid.

- [ ] **Step 3: Run the final repository audit**

```bash
rg -n "Angular|@angular/|ng serve|ng build|Angular Signals|Karma|Jasmine" . \
  --glob '!docs/superpowers/specs/2026-07-22-angular-to-react-migration-design.md' \
  --glob '!docs/superpowers/plans/2026-07-22-angular-to-react-migration.md' \
  --glob '!docs/migrations/angular-to-react/**' \
  --glob '!.agents-backeup/**' \
  --glob '!.git/**'
```

Expected: only explicitly labeled historical documents or archived records match; no active rule, source, script, CI, Docker, or README match remains.

- [ ] **Step 4: Run complete verification**

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test:coverage
npm --prefix frontend run build
npm --prefix frontend run test:e2e
uv run --project backend pytest
```

Expected: all commands exit 0, frontend coverage is at least 75 percent, and backend regression tests pass.

- [ ] **Step 5: Commit final documentation and rules**

```bash
git add .agents/rules/flae-code.md DESIGN.md frontend/README.md README.md repo_map.txt docs
git commit -m "docs: finalize React frontend standards"
```

## Final acceptance checklist

- [ ] React is the only supported frontend and lives at `frontend/`.
- [ ] Every route in `route-parity.md` is implemented and verified.
- [ ] Firebase email, Google login, restore, sync-user, and logout flows pass.
- [ ] Workspace selection, invitations, membership, and settings flows pass.
- [ ] Knowledge, topics, agents, chat, and graph acceptance cases pass.
- [ ] Streaming uses authorization headers and deterministic cancellation.
- [ ] No source file exceeds 450 lines.
- [ ] Shared UI meets keyboard, focus, reduced-motion, and WCAG AA requirements.
- [ ] Primary brand colors remain tokenized and unchanged.
- [ ] Typecheck, lint, coverage, build, E2E, and backend tests pass.
- [ ] Frontend coverage is at least 75 percent.
- [ ] Active rules, scripts, Docker, CI, and documentation describe React rather than Angular.
