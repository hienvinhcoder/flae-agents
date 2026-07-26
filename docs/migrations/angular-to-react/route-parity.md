# Angular to React route parity contract

This document freezes the observable route behavior of the Angular frontend before the React migration. The Angular files named below are reference-only. React target names are stable migration names, not existing Angular symbols.

## Verification status

Every route row is decided. The 74 stable IDs are checked in [`acceptance-checklist.md`](acceptance-checklist.md), whose evidence matrix distinguishes deterministic browser E2E coverage from Vitest integration/unit coverage. Browser fixtures use the real React router, pages, hooks, and production adapters; they replace only authentication identity and backend transport behind a development-only `VITE_E2E_MODE` gate.

| Route group | Browser evidence | Supporting evidence |
| --- | --- | --- |
| Root, auth, protected redirects, dashboard shell | [`auth.spec.ts`](../../../frontend-react/tests/e2e/auth.spec.ts) | [`router.test.tsx`](../../../frontend-react/src/app/router/router.test.tsx), [`ProtectedRoute.test.tsx`](../../../frontend-react/src/core/auth/ProtectedRoute.test.tsx), [`GuestRoute.test.tsx`](../../../frontend-react/src/core/auth/GuestRoute.test.tsx) |
| Workspace, settings, invitation | [`workspace.spec.ts`](../../../frontend-react/tests/e2e/workspace.spec.ts) | [`SettingsPage.test.tsx`](../../../frontend-react/src/features/settings/pages/SettingsPage.test.tsx), [`InviteAcceptPage.test.tsx`](../../../frontend-react/src/features/invite/pages/InviteAcceptPage.test.tsx) |
| Knowledge and graph | [`knowledge.spec.ts`](../../../frontend-react/tests/e2e/knowledge.spec.ts), [`graph.spec.ts`](../../../frontend-react/tests/e2e/graph.spec.ts) | [`KnowledgeListPage.test.tsx`](../../../frontend-react/src/features/knowledge/pages/KnowledgeListPage.test.tsx), [`KnowledgeGraphPage.test.tsx`](../../../frontend-react/src/features/knowledge/pages/KnowledgeGraphPage.test.tsx) |
| Topics | [`topics.spec.ts`](../../../frontend-react/tests/e2e/topics.spec.ts) | [`TopicListPage.test.tsx`](../../../frontend-react/src/features/topics/pages/TopicListPage.test.tsx), [`TopicDetailPage.test.tsx`](../../../frontend-react/src/features/topics/pages/TopicDetailPage.test.tsx) |
| Agents and chat | [`agents.spec.ts`](../../../frontend-react/tests/e2e/agents.spec.ts), [`chat.spec.ts`](../../../frontend-react/tests/e2e/chat.spec.ts) | [`AgentListPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentListPage.test.tsx), [`AgentConfigPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentConfigPage.test.tsx), [`AgentChatPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentChatPage.test.tsx) |

No screenshot threshold is used as an acceptance proxy. Responsive polish and canvas rendering remain subject to ordinary manual visual review, while route behavior, keyboard interaction, focus, accessibility semantics, and critical mutations have deterministic specifications. Playwright discovers all 11 tests, but the local sandbox cannot bind port 4200; CI/root-host execution remains required before claiming the browser suite passes. The optional real-backend smoke is limited to public health and requires `E2E_REAL_BACKEND_URL`; deterministic parity does not depend on a real Firebase account or mutable backend records.

## Guard and layout rules

- `authGuard` waits until Firebase authentication initialization has completed. An authenticated user proceeds; a guest is redirected to `/auth/login?returnUrl=<requested-url>`.
- `requireNoAuthGuard` also waits for authentication initialization. A guest proceeds; an authenticated user is redirected to `/dashboard`.
- All `/dashboard/*` pages render inside `AdminLayoutComponent`. The layout loads workspaces, shows the workspace sync banner, restores the active workspace from local storage, then falls back to the user's `current_workspace_id`, then to the first workspace. An invalid saved workspace is discarded.
- The route tree defines no wildcard or not-found route. React must not introduce a silent catch-all redirect as route parity; not-found behavior needs a separate product decision.

## Route table

“No dedicated state” means the Angular page does not model that state; it is not permission to add an unrelated React behavior during parity work.

| URL | Angular route behavior / source | Auth | React target | Loading state | Empty state | Error state | Acceptance ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Full-match redirect in `app.routes.ts` to `/auth/login` | None | `RootRedirect` | None | N/A | N/A | ROUTE-01 |
| `/auth` | Full-match child redirect in `features/auth/auth.routes.ts` to `/auth/login` | Guest-only (`requireNoAuthGuard`) | `AuthIndexRedirect` | Guard waits for auth readiness | N/A | N/A | ROUTE-02, AUTH-01 |
| `/auth/login` | `AuthContainerComponent`, mode `login` | Guest-only; authenticated users go to `/dashboard` | `LoginPage` | Angular clears email loading when Firebase resolves but leaves Google loading true after success. Approved React UX hardening clears the local Google pending state when the popup resolves, while the guest guard continues rendering only its session skeleton until backend sync authenticates the user | N/A | Inline mapped Firebase error; backend sync failure leaves the database user unset and is retried by the first auth-state snapshot | AUTH-01, AUTH-02, AUTH-04 |
| `/auth/register` | `AuthContainerComponent`, mode `register` | Guest-only; authenticated users go to `/dashboard` | `RegisterPage` | Registration clears loading as soon as Firebase resolves, before backend sync and navigation | N/A | Inline duplicate-email, weak-password, and fallback errors | AUTH-01, AUTH-03, AUTH-04 |
| `/invite` (`?token=<token>`) | `InviteAcceptComponent` | Required (`authGuard`) | `InviteAcceptPage` | Accept button enters `isProcessing`; success state lasts 1.5 seconds before navigation | Missing token alerts and redirects to `/dashboard` | Invalid/expired/failed acceptance alerts and redirects to `/dashboard`; rejection confirms, alerts, then redirects | WS-03, WS-04 |
| `/dashboard` | Full-match redirect in `app.routes.ts` to `/dashboard/briefing` | Required (`authGuard`) | `DashboardIndexRedirect` | Guard waits for auth readiness; layout may still sync workspaces | No workspaces leaves active workspace unset | Workspace load failure ends sync state and logs the error | ROUTE-03, WS-02, WS-08 |
| `/dashboard/briefing` | `BriefingComponent` inside `AdminLayoutComponent` | Required | `BriefingPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-04 |
| `/dashboard/inbox` | `InboxComponent` inside `AdminLayoutComponent` | Required | `InboxPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-05 |
| `/dashboard/chat` | `ChatPageComponent` inside `AdminLayoutComponent`; uses the workspace default agent | Required | `DefaultChatPage` | Separate default-agent, session, message, create-session, and streaming states | Missing default agent; no sessions; selected session with no messages; a zero-match session search renders a blank grouped list when underlying sessions still exist | Fetch/mutation and stream transport/parse failures show a toast; transport/parse failure replaces pending assistant text, while message-level `{ type: 'error' }` completes and reloads without toast/fallback | CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, WS-08 |
| `/dashboard/agents` | `AgentListComponent` inside `AdminLayoutComponent` | Required | `AgentListPage` | Agent-list spinner; workspace-role lookup runs alongside it | Dedicated no-agents card; create action shown only to owner/admin | Fetch/delete failures show toasts; role lookup failure falls back to `member` | AGENT-01, AGENT-02, AGENT-07 |
| `/dashboard/agents/new` | `AgentConfigComponent` in create mode | Required; component additionally permits owner/admin only | `AgentCreatePage` | No permission-loading state; only submission sets `loading`, disables the submit button, and shows its spinner | N/A | Permission failure or denied role redirects to agent list; create failure toasts and retains form | AGENT-02, AGENT-03, WS-08 |
| `/dashboard/agents/:agentId/edit` | `AgentConfigComponent` in edit mode | Required; component additionally permits owner/admin only | `AgentEditPage` | Agent fetch/submit spinner | Missing or inaccessible agent is treated as an error and redirects | Permission check redirects when no workspace, but Angular still starts a malformed `/workspaces/null/agents/:agentId` fetch; update failure toasts and retains form | AGENT-02, AGENT-04, WS-08 |
| `/dashboard/agents/:agentId/chat` | `AgentChatComponent` | Required | `AgentChatPage` | Separate agent, sessions, messages, create-session, and streaming states | No sessions prompts creation; selected empty session prompts first message | With no workspace Angular can issue `/workspaces/null/...` with an empty header; other request/stream failures toast, while message-level `{ type: 'error' }` completes/reloads silently | AGENT-05, AGENT-06, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, WS-08 |
| `/dashboard/knowledge` | `KnowledgeListComponent` | Required | `KnowledgeListPage` | Document fetch, upload, manual-save, delete/retry action; processing documents poll every five seconds | Table empty state covers no documents and filters with no matches | Fetch failure clears documents; action errors toast with backend detail/fallback text | KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, KB-08, KB-09 |
| `/dashboard/knowledge/graph` | `KnowledgeGraphComponent` | Required | `KnowledgeGraphPage` | Full-canvas graph loading overlay | Dedicated empty graph prompt links back to knowledge upload | Fetch failure clears graph and selection and shows a toast | GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05, GRAPH-06 |
| `/dashboard/topics` | `TopicListComponent` | Required | `TopicListPage` | Topic fetch/merge spinner | Dedicated no-topics/no-filter-results state; merge disabled with fewer than two topics | Fetch/merge failures show translated toasts | TOPIC-01, TOPIC-02, TOPIC-03, TOPIC-04 |
| `/dashboard/topics/:id` | `TopicDetailComponent` | Required | `TopicDetailPage` | Detail fetch and update/re-summarize processing states | Missing summary and empty chunk/document/entity tabs each have dedicated copy | Detail failure toasts then returns to topic list; save/re-summarize failures toast and preserve the page | TOPIC-05, TOPIC-06, TOPIC-07 |
| `/dashboard/reports` | `ReportsComponent` inside `AdminLayoutComponent` | Required | `ReportsPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-06 |
| `/dashboard/settings` | `SettingsComponent` with `WorkspaceGeneralComponent` and `WorkspaceMembersComponent` | Required | `SettingsPage` | Layout workspace sync banner; form save and invitation submit are visible; member fetch has an internal loading flag that Angular does not pass to its lists | No current workspace leaves an unset edit form that cannot save (current behavior); member and invitation lists have empty states | Workspace/member/invitation mutations use alerts or logs; failed list requests stop loading and retain/leave current data | WS-01, WS-05, WS-06, WS-07, WS-08 |

## Redirect and navigation parity details

- Successful authentication uses the `returnUrl` query parameter when `AuthContainerComponent` observes an authenticated user; the authentication watcher otherwise navigates an auth URL to `/dashboard` after backend sync.
- A `401` from a backend request resets authentication, logs out of Firebase, warns the user, and redirects to `/auth/login?returnUrl=<current-url>`.
- Accepting an invitation adds the returned workspace to local state, makes it active, then navigates to `/dashboard/settings`. Rejecting, missing-token, expired-token, and other acceptance failures return to `/dashboard`.
- Agent create/update returns to `/dashboard/agents`. Agent fetch or authorization failure also returns there.
- Topic detail fetch failure returns to `/dashboard/topics`.
- Logging out clears both auth and workspace state/local storage, then navigates to `/auth/login`.

## Explicit React hardening boundaries

- **Adopted React UX hardening:** the Google-success path clears its local pending state instead of preserving Angular's stuck loading flag. `RequireAnonymousRoute` remains in its session-check state during backend sync, so the form does not reappear. This is intentionally not described as Angular parity; it was approved because the project is unreleased and the user explicitly allowed UI/UX redesign, and it is covered by `LoginPage` and guest-route tests.
- Blocking or disabling the agent-create form until the asynchronous owner/admin permission lookup resolves would be React hardening. Angular renders the active form while that lookup is pending.
- A dedicated “no matching sessions” message would improve session search, but Angular currently renders no distinct message when sessions exist and all are filtered out.
- Treating a message-level chat `{ type: 'error' }` as a visible toast/fallback would be an improvement. Angular currently treats it like `done`: close, complete, and reload persisted messages.
- Gating agent edit/chat and every other workspace-dependent request until a validated workspace ID exists is required React hardening (`WS-08`). Angular currently permits malformed `/workspaces/null/...` calls in those two pages.
- Fully removing hidden graph nodes/edges from gravity, integration, and edge-particle simulation is React hardening. Angular filters visible drawing, repulsion, and springs but still advances hidden elements in the remaining simulation loops (`GRAPH-03`).

## Source inventory

The route contract was derived from `frontend/src/app/app.routes.ts` and every `frontend/src/app/features/*/*.routes.ts` file. The route inventory command and its mapping audit are recorded in `acceptance-checklist.md`.
