# Angular to React route parity contract

This document freezes the observable route behavior of the Angular frontend before the React migration. The Angular files named below are reference-only. React target names are stable migration names, not existing Angular symbols.

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
| `/auth` | Full-match child redirect in `features/auth/auth.routes.ts` to `/auth/login` | Guest-only (`requireNoAuthGuard`) | `AuthIndexRedirect` | Guard waits for auth readiness | N/A | N/A | ROUTE-02 |
| `/auth/login` | `AuthContainerComponent`, mode `login` | Guest-only; authenticated users go to `/dashboard` | `LoginPage` | Email login clears loading as soon as Firebase resolves, before backend sync; Google login has no success handler, so its shared loading flag remains true after success/navigation | N/A | Inline mapped Firebase error; backend sync failure leaves the database user unset and is logged for a later auth-state retry | AUTH-02 |
| `/auth/register` | `AuthContainerComponent`, mode `register` | Guest-only; authenticated users go to `/dashboard` | `RegisterPage` | Registration clears loading as soon as Firebase resolves, before backend sync and navigation | N/A | Inline duplicate-email, weak-password, and fallback errors | AUTH-03 |
| `/invite` (`?token=<token>`) | `InviteAcceptComponent` | Required (`authGuard`) | `InviteAcceptPage` | Accept button enters `isProcessing`; success state lasts 1.5 seconds before navigation | Missing token alerts and redirects to `/dashboard` | Invalid/expired/failed acceptance alerts and redirects to `/dashboard`; rejection confirms, alerts, then redirects | WS-03 |
| `/dashboard` | Full-match redirect in `app.routes.ts` to `/dashboard/briefing` | Required (`authGuard`) | `DashboardIndexRedirect` | Guard waits for auth readiness; layout may still sync workspaces | No workspaces leaves active workspace unset | Workspace load failure ends sync state and logs the error | ROUTE-03 |
| `/dashboard/briefing` | `BriefingComponent` inside `AdminLayoutComponent` | Required | `BriefingPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-04 |
| `/dashboard/inbox` | `InboxComponent` inside `AdminLayoutComponent` | Required | `InboxPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-05 |
| `/dashboard/chat` | `ChatPageComponent` inside `AdminLayoutComponent`; uses the workspace default agent | Required | `DefaultChatPage` | Separate default-agent, session, message, create-session, and streaming states | Missing default agent; no sessions; selected session with no messages; a zero-match session search renders a blank grouped list when underlying sessions still exist | Fetch/mutation and stream transport/parse failures show a toast; transport/parse failure replaces pending assistant text, while message-level `{ type: 'error' }` completes and reloads without toast/fallback | CHAT-01 |
| `/dashboard/agents` | `AgentListComponent` inside `AdminLayoutComponent` | Required | `AgentListPage` | Agent-list spinner; workspace-role lookup runs alongside it | Dedicated no-agents card; create action shown only to owner/admin | Fetch/delete failures show toasts; role lookup failure falls back to `member` | AGENT-01 |
| `/dashboard/agents/new` | `AgentConfigComponent` in create mode | Required; component additionally permits owner/admin only | `AgentCreatePage` | Permission lookup and submit state; submit button shows spinner and is disabled | N/A | Permission failure or denied role redirects to agent list; create failure toasts and retains form | AGENT-03 |
| `/dashboard/agents/:agentId/edit` | `AgentConfigComponent` in edit mode | Required; component additionally permits owner/admin only | `AgentEditPage` | Agent fetch/submit spinner | Missing or inaccessible agent is treated as an error and redirects | Permission/fetch failure toasts and redirects; update failure toasts and retains form | AGENT-04 |
| `/dashboard/agents/:agentId/chat` | `AgentChatComponent` | Required | `AgentChatPage` | Separate agent, sessions, messages, create-session, and streaming states | No sessions prompts creation; selected empty session prompts first message | Missing/failing agent redirects; request and stream transport/parse failures toast; transport/parse failure renders fallback assistant text, while message-level `{ type: 'error' }` completes and reloads silently | AGENT-05 |
| `/dashboard/knowledge` | `KnowledgeListComponent` | Required | `KnowledgeListPage` | Document fetch, upload, manual-save, delete/retry action; processing documents poll every five seconds | Table empty state covers no documents and filters with no matches | Fetch failure clears documents; action errors toast with backend detail/fallback text | KB-01 |
| `/dashboard/knowledge/graph` | `KnowledgeGraphComponent` | Required | `KnowledgeGraphPage` | Full-canvas graph loading overlay | Dedicated empty graph prompt links back to knowledge upload | Fetch failure clears graph and selection and shows a toast | GRAPH-01 |
| `/dashboard/topics` | `TopicListComponent` | Required | `TopicListPage` | Topic fetch/merge spinner | Dedicated no-topics/no-filter-results state; merge disabled with fewer than two topics | Fetch/merge failures show translated toasts | TOPIC-01 |
| `/dashboard/topics/:id` | `TopicDetailComponent` | Required | `TopicDetailPage` | Detail fetch and update/re-summarize processing states | Missing summary and empty chunk/document/entity tabs each have dedicated copy | Detail failure toasts then returns to topic list; save/re-summarize failures toast and preserve the page | TOPIC-05 |
| `/dashboard/reports` | `ReportsComponent` inside `AdminLayoutComponent` | Required | `ReportsPage` | No dedicated state | Static “under development” placeholder is the entire page | No dedicated state | ROUTE-06 |
| `/dashboard/settings` | `SettingsComponent` with `WorkspaceGeneralComponent` and `WorkspaceMembersComponent` | Required | `SettingsPage` | Layout workspace sync banner; form save and invitation submit are visible; member fetch has an internal loading flag that Angular does not pass to its lists | No current workspace leaves an unset edit form that cannot save (current behavior); member and invitation lists have empty states | Workspace/member/invitation mutations use alerts or logs; failed list requests stop loading and retain/leave current data | WS-01 |

## Redirect and navigation parity details

- Successful authentication uses the `returnUrl` query parameter when `AuthContainerComponent` observes an authenticated user; the authentication watcher otherwise navigates an auth URL to `/dashboard` after backend sync.
- A `401` from a backend request resets authentication, logs out of Firebase, warns the user, and redirects to `/auth/login?returnUrl=<current-url>`.
- Accepting an invitation adds the returned workspace to local state, makes it active, then navigates to `/dashboard/settings`. Rejecting, missing-token, expired-token, and other acceptance failures return to `/dashboard`.
- Agent create/update returns to `/dashboard/agents`. Agent fetch or authorization failure also returns there.
- Topic detail fetch failure returns to `/dashboard/topics`.
- Logging out clears both auth and workspace state/local storage, then navigates to `/auth/login`.

## Explicit React hardening boundaries

- A unified auth loading state that remains active through backend sync, and a Google-success path that clears loading, would improve the current behavior but are not Angular parity. They require explicit React hardening acceptance before implementation.
- A dedicated “no matching sessions” message would improve session search, but Angular currently renders no distinct message when sessions exist and all are filtered out.
- Treating a message-level chat `{ type: 'error' }` as a visible toast/fallback would be an improvement. Angular currently treats it like `done`: close, complete, and reload persisted messages.

## Source inventory

The route contract was derived from `frontend/src/app/app.routes.ts` and every `frontend/src/app/features/*/*.routes.ts` file. The route inventory command and its mapping audit are recorded in `acceptance-checklist.md`.
