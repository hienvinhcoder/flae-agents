# Angular to React behavior acceptance checklist

These stable IDs define migration acceptance. Tests may be component, integration, or end-to-end tests, but each ID must remain independently reportable. Unless stated otherwise, all backend calls use the contracts in `api-contracts.md` and all authenticated routes render in the dashboard layout.

## Automated evidence matrix

All 74 stable IDs below are decided and checked. Evidence labels are precise: E2E identifies the deterministic browser specification for the real React route and production adapter; integration/unit identifies the passing Vitest evidence for the named route, component, hook, transport, or schema directly.

| Stable IDs | Evidence level | Automated evidence |
| --- | --- | --- |
| ROUTE-01–ROUTE-03, ROUTE-07 | Integration | [`router.test.tsx`](../../../frontend-react/src/app/router/router.test.tsx), [`ProtectedRoute.test.tsx`](../../../frontend-react/src/core/auth/ProtectedRoute.test.tsx), [`GuestRoute.test.tsx`](../../../frontend-react/src/core/auth/GuestRoute.test.tsx), [`RouteErrorBoundary.test.tsx`](../../../frontend-react/src/app/errors/RouteErrorBoundary.test.tsx) |
| ROUTE-04–ROUTE-06 | Integration | [`supporting-pages.test.tsx`](../../../frontend-react/src/features/supporting-pages.test.tsx) |
| AUTH-01–AUTH-06, AUTH-02A, AUTH-02B | E2E plus integration/unit | [`auth.spec.ts`](../../../frontend-react/tests/e2e/auth.spec.ts), [`AuthBootstrap.test.tsx`](../../../frontend-react/src/core/auth/AuthBootstrap.test.tsx), [`AuthBootstrap.registration.test.tsx`](../../../frontend-react/src/core/auth/AuthBootstrap.registration.test.tsx), [`AuthBootstrap.e2e.test.tsx`](../../../frontend-react/src/core/auth/AuthBootstrap.e2e.test.tsx), [`LoginPage.test.tsx`](../../../frontend-react/src/features/auth/pages/LoginPage.test.tsx), [`RegisterPage.test.tsx`](../../../frontend-react/src/features/auth/pages/RegisterPage.test.tsx), [`useLogout.test.tsx`](../../../frontend-react/src/core/auth/useLogout.test.tsx) |
| WS-01–WS-08, WS-05A–WS-05C | E2E plus integration/unit | [`workspace.spec.ts`](../../../frontend-react/tests/e2e/workspace.spec.ts), [`AppShell.test.tsx`](../../../frontend-react/src/app/layout/AppShell.test.tsx), [`use-workspaces.test.tsx`](../../../frontend-react/src/features/settings/hooks/use-workspaces.test.tsx), [`SettingsPage.test.tsx`](../../../frontend-react/src/features/settings/pages/SettingsPage.test.tsx), [`InviteAcceptPage.test.tsx`](../../../frontend-react/src/features/invite/pages/InviteAcceptPage.test.tsx), [`workspace-api.test.ts`](../../../frontend-react/src/features/settings/api/workspace-api.test.ts) |
| KB-01–KB-09 | E2E plus integration/unit | [`knowledge.spec.ts`](../../../frontend-react/tests/e2e/knowledge.spec.ts), [`KnowledgeListPage.test.tsx`](../../../frontend-react/src/features/knowledge/pages/KnowledgeListPage.test.tsx), [`use-knowledge.test.tsx`](../../../frontend-react/src/features/knowledge/hooks/use-knowledge.test.tsx), [`knowledge-api.test.ts`](../../../frontend-react/src/features/knowledge/api/knowledge-api.test.ts), [`knowledge-schema.test.ts`](../../../frontend-react/src/features/knowledge/schemas/knowledge-schema.test.ts) |
| TOPIC-01–TOPIC-07 | E2E plus integration/unit | [`topics.spec.ts`](../../../frontend-react/tests/e2e/topics.spec.ts), [`TopicListPage.test.tsx`](../../../frontend-react/src/features/topics/pages/TopicListPage.test.tsx), [`TopicDetailPage.test.tsx`](../../../frontend-react/src/features/topics/pages/TopicDetailPage.test.tsx), [`use-topics.test.tsx`](../../../frontend-react/src/features/topics/hooks/use-topics.test.tsx), [`topics-api.test.ts`](../../../frontend-react/src/features/topics/api/topics-api.test.ts) |
| AGENT-01–AGENT-07 | E2E plus integration/unit | [`agents.spec.ts`](../../../frontend-react/tests/e2e/agents.spec.ts), [`AgentListPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentListPage.test.tsx), [`AgentConfigPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentConfigPage.test.tsx), [`AgentChatPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentChatPage.test.tsx), [`use-agents.test.tsx`](../../../frontend-react/src/features/agents/hooks/use-agents.test.tsx), [`agents-api.test.ts`](../../../frontend-react/src/features/agents/api/agents-api.test.ts) |
| CHAT-01–CHAT-07, CHAT-05A–CHAT-05C | E2E plus integration/unit | [`chat.spec.ts`](../../../frontend-react/tests/e2e/chat.spec.ts), [`AgentChatPage.test.tsx`](../../../frontend-react/src/features/agents/pages/AgentChatPage.test.tsx), [`use-chat-stream.test.tsx`](../../../frontend-react/src/features/chat/hooks/use-chat-stream.test.tsx), [`ConversationMessages.test.tsx`](../../../frontend-react/src/features/chat/ui/ConversationMessages.test.tsx), [`sse.test.ts`](../../../frontend-react/src/core/realtime/sse.test.ts), [`stream.test.ts`](../../../frontend-react/src/features/chat/types/stream.test.ts) |
| GRAPH-01–GRAPH-06, GRAPH-02A–GRAPH-02C | E2E plus integration/unit | [`graph.spec.ts`](../../../frontend-react/tests/e2e/graph.spec.ts), [`KnowledgeGraphPage.test.tsx`](../../../frontend-react/src/features/knowledge/pages/KnowledgeGraphPage.test.tsx), [`use-graph-controller.test.tsx`](../../../frontend-react/src/features/knowledge/graph/hooks/use-graph-controller.test.tsx), [`graph-renderer.test.ts`](../../../frontend-react/src/features/knowledge/graph/graph-renderer.test.ts), [`GraphCanvas.test.tsx`](../../../frontend-react/src/features/knowledge/graph/ui/GraphCanvas.test.tsx), [`graph-simulation.test.ts`](../../../frontend-react/src/features/knowledge/graph/graph-simulation.test.ts) |
| API-01–API-06 | E2E plus integration/unit | [`workspace.spec.ts`](../../../frontend-react/tests/e2e/workspace.spec.ts), [`chat.spec.ts`](../../../frontend-react/tests/e2e/chat.spec.ts), [`client.test.ts`](../../../frontend-react/src/core/api/client.test.ts), [`client-global-failures.test.ts`](../../../frontend-react/src/core/api/client-global-failures.test.ts), [`auth-api.test.ts`](../../../frontend-react/src/features/auth/api/auth-api.test.ts), [`workspace-api.test.ts`](../../../frontend-react/src/features/settings/api/workspace-api.test.ts), [`sse.test.ts`](../../../frontend-react/src/core/realtime/sse.test.ts) |

Accessibility evidence uses `@axe-core/playwright` on auth, the dashboard shell, knowledge, the settings invitation dialog, chat, and graph. [`auth.spec.ts`](../../../frontend-react/tests/e2e/auth.spec.ts) and [`workspace.spec.ts`](../../../frontend-react/tests/e2e/workspace.spec.ts) also cover keyboard-only navigation, focus trapping, and focus restoration without brittle visual snapshots.

The 10 deterministic tests use fixed synthetic UUIDs and `example.invalid` addresses. Playwright also discovers one optional real-backend smoke test, for 11 tests total. This local verification environment cannot bind port 4200, so browser execution remains a CI/root-host gate rather than a claimed local pass. [`real-backend.smoke.spec.ts`](../../../frontend-react/tests/e2e/real-backend.smoke.spec.ts) runs only when `E2E_REAL_BACKEND_URL` is set; it verifies public health only and does not claim account-backed parity or mutable-data coverage.

## Routing and shell

- [x] **ROUTE-01 — redirects the root URL.** Visiting `/` replaces/navigates to `/auth/login` and does not render dashboard content.
- [x] **ROUTE-02 — redirects the auth index.** A guest visiting `/auth` lands on `/auth/login`; an authenticated user visiting `/auth`, `/auth/login`, or `/auth/register` lands on `/dashboard` only after auth readiness.
- [x] **ROUTE-03 — redirects the dashboard index.** An authenticated user visiting `/dashboard` lands on `/dashboard/briefing`; a guest is sent to `/auth/login?returnUrl=%2Fdashboard`.
- [x] **ROUTE-04 — renders the briefing placeholder.** `/dashboard/briefing` renders the Angular-equivalent “under development” briefing state inside the dashboard shell.
- [x] **ROUTE-05 — renders the inbox placeholder.** `/dashboard/inbox` renders the Angular-equivalent “under development” inbox state inside the dashboard shell.
- [x] **ROUTE-06 — renders the reports placeholder.** `/dashboard/reports` renders the Angular-equivalent “under development” reports state inside the dashboard shell.
- [x] **ROUTE-07 — preserves unknown-route behavior intentionally.** Because Angular defines no wildcard route, the React router must not silently redirect unknown URLs; any not-found page is a separately approved change.

## Authentication

- [x] **AUTH-01 — restores Firebase session.** App initialization waits for Firebase redirect handling and `authStateReady`, obtains the restored user's token, calls auth sync, stores the database user, then releases route guards without a false login redirect.
- [x] **AUTH-02 — signs in and returns to the requested route.** Email/password sign-in sets loading until Firebase returns, then clears it before backend sync; navigation waits for the synced database user and honors the captured `returnUrl` (default `/dashboard`). The Angular Google popup path leaves its shared loading flag true after success. The approved React target deliberately clears the form's Google pending state when the popup resolves while `RequireAnonymousRoute` continues showing the session-check skeleton through backend sync, so no auth form flashes before navigation. Either path clears loading in its error handler.
  - [x] **AUTH-02A — signs in with email/password.** Firebase success clears loading before backend sync; the synced user triggers the captured/default navigation.
  - [x] **AUTH-02B — signs in with Google.** Popup success relies on auth-state sync/navigation. Angular leaves its shared loading flag true; React intentionally clears the local popup pending state on success and keeps route-level session blocking active until sync finishes. `LoginPage` and guest-route tests lock this adopted behavior.
- [x] **AUTH-03 — registers a user.** Registration sets loading until Firebase returns, clears it before backend sync, then routes after the synced database user reaches the store; duplicate email, weak password, and fallback failures clear loading and render the mapped inline error.
- [x] **AUTH-04 — reports login failures.** Wrong password/user-not-found/invalid credential share the invalid-credentials message; a closed Google popup has the cancellation message; leaving the auth page clears stale errors and subscriptions.
- [x] **AUTH-05 — logs out completely.** Logout resets auth state, workspace state, and persisted active workspace, then navigates to `/auth/login`; a failed logout stops loading and exposes an error.
- [x] **AUTH-06 — reacts to session expiry.** A backend `401` resets auth, signs out of Firebase, shows the expiry warning, and routes to login with the current URL as `returnUrl`; an auth-state transition to null does the equivalent redirect.

Clearing the Google success pending state is an approved React UX hardening decision, not Angular parity. It is adopted because the project is unreleased and the user explicitly allowed UI/UX redesign; route-level auth blocking still prevents premature rendering during backend synchronization.

## Workspaces, settings, membership, invitations, and OAuth

- [x] **WS-01 — renders workspace settings states.** `/dashboard/settings` defaults to General, `?mode=create` opens create mode, Members clears create mode, save/invite actions expose loading, and member/invitation lists render explicit empty states.
- [x] **WS-02 — restores and synchronizes workspace selection.** After workspace loading, selection precedence is valid local storage ID, user profile ID, then first workspace; zero workspaces clears selection. Automatic initialization writes signal/storage before the current-workspace request and applies the returned user to the auth profile only after success. Sidebar changes also write signal/storage before the request but never apply its returned user to the profile. Either path logs failure and retains the local selection.
- [x] **WS-03 — rejects an expired invite.** `/invite?token=<expired>` shows processing only while submitting, displays the backend/fallback expiration error, does not add/select a workspace, and returns to `/dashboard`. A missing token follows the invalid-token redirect without sending a request.
- [x] **WS-04 — accepts or declines an invite.** Acceptance adds and selects the returned workspace, renders success, then routes to Settings after 1.5 seconds; confirmed decline performs no API mutation and returns to the dashboard.
- [x] **WS-05 — enforces membership actions.** Only owner/admin users can invite and manage allowed member fields; successful role/status/remove/invite operations update local lists, while failures preserve data and surface the backend/fallback error.
  - [x] **WS-05A — scopes invitation reads and writes.** Active owner/admin can list and create invitations; member/viewer receives `403`; token failure receives `401`.
  - [x] **WS-05B — enforces role/status ownership rules.** Nobody changes their own role/status; only owner changes owner/admin or transfers ownership; admin changes only member/viewer and cannot promote to owner/admin.
  - [x] **WS-05C — distinguishes removal UI policy from backend enforcement.** Angular hides all self-management controls. Backend rejects owner removal (`400`) and an admin removing another admin (`403`), but permits an admin to remove itself because the self branch runs first. React may retain a frontend prohibition as Angular-visible policy and defense-in-depth hardening, but must not describe a direct admin self-removal request as backend `403`; changing that server result requires separate backend hardening.
- [x] **WS-06 — keeps invitation revocation local-only.** Revoking a pending invitation removes it from current UI state without issuing an HTTP request, documenting the current missing backend endpoint.
- [x] **WS-07 — records the unavailable workspace OAuth contract.** Angular sends the documented URL/callback payloads, but this repository has no matching backend routes; current calls return `404`. React must not claim a successful typed OAuth flow without a separately supplied backend contract.
- [x] **WS-08 — gates workspace-dependent requests (required React hardening).** Current Angular agent edit and agent-specific chat may issue `/workspaces/null/agents/...` requests with an empty workspace header while selection is absent/loading. React must not start any workspace-dependent query or mutation until it has a validated workspace ID; load failure stops the sync banner and retains existing/empty state without malformed calls.

## Knowledge base and ingestion

- [x] **KB-01 — renders the knowledge route.** `/dashboard/knowledge` fetches for the active workspace, displays table loading, then renders documents or the dedicated no-results state; workspace changes reload and no workspace clears the list.
- [x] **KB-02 — handles document fetch error.** A failed list request exits loading, clears the current documents as Angular does, and allows the global/local error UI to remain usable.
- [x] **KB-03 — validates and uploads a document.** Upload requires a selected workspace, file, title, supported PDF/MD/TXT format, and at most 50 MB. Angular incorrectly prepends the sparse `DocumentUploadResponse` as a complete document; React validates that sparse result, refetches/list-normalizes before storing a full row, closes/toasts, and starts polling. Failure retains the modal and displays detail/message fallback.
- [x] **KB-04 — creates a manual document.** Valid title/content posts the manual payload. Angular incorrectly prepends the sparse response; React validates it and refetches/list-normalizes before storing a full document, then closes/toasts and starts polling. Failure resets saving and preserves input.
- [x] **KB-05 — retries failed ingestion.** Retrying disables the action. Angular replaces the list/detail object with the sparse response; React validates it and refetches/list-normalizes before replacing full document state, then toasts and resumes polling. Failure preserves the failed document and displays an error.
- [x] **KB-06 — deletes a document and selection.** Confirmed successful deletion removes the document and closes/clears its detail panel; a false/error response leaves both list and selection intact and exits processing.
- [x] **KB-07 — polls only active ingestion.** Poll every five seconds only with pending/processing documents, an active workspace, and a reachable server; refresh the open detail from returned data; stop when no work remains.
- [x] **KB-08 — cleans up knowledge effects.** Navigating away cancels the polling interval and no later result mutates an unmounted React page.
- [x] **KB-09 — validates knowledge mutation and ingestion contracts.** Upload/manual/retry require `{ id: UUID string, title: string, status: pending|processing|completed|failed, temporal_workflow_id: string|null }`. Status requires `{ document_id: UUID string, status, error_message: string|null, chunk_count: integer|null, entity_count: integer|null, relation_count: integer|null, processing_time_seconds: number|null }`. Invalid data is a contract error; HTTP `404` remains an error rather than a status value.

## Topics

- [x] **TOPIC-01 — renders topic list states.** `/dashboard/topics` shows fetch loading, topic cards on success, and the dedicated empty/no-filter-results state; fetch errors exit loading and show the translated toast.
- [x] **TOPIC-02 — filters topics.** Status filtering is immediate; name/summary search is case-insensitive and applies after the 300 ms debounce.
- [x] **TOPIC-03 — cleans up topic search.** Replacing a search cancels the prior timer, and unmount cancels the pending timer so it cannot update the unmounted page.
- [x] **TOPIC-04 — merges selected topics.** The merge action is disabled with fewer than two topics; the dialog requires one target and at least one different source, resets sources when target changes, submits all selected source IDs, closes, reloads on success, and exposes an error without losing the list on failure.
- [x] **TOPIC-05 — renders topic detail states.** `/dashboard/topics/:id` reloads when route ID or workspace changes, shows detail loading, renders summary/member-tab empty states, and returns to `/dashboard/topics` with a toast on missing/error.
- [x] **TOPIC-06 — edits and re-summarizes a topic.** Blank names are rejected; save sends name/status, reloads the detail on success, and retains edit state on failure; re-summarize disables concurrent actions and reports success/failure.
- [x] **TOPIC-07 — validates topic update.** Although the endpoint response model is `Any`, the service returns five required strings: `workspace_id`, `topic_id`, `name`, `slug`, and `status`. React validates all five and narrows `status` to its supported enum before updating domain state; missing/unsupported data is a contract error.

## Agents and agent-specific chat

- [x] **AGENT-01 — renders agent list states.** `/dashboard/agents` shows loading, a dedicated empty card, or agent cards; fetch failure exits loading and toasts; a workspace change reloads the list.
- [x] **AGENT-02 — applies role-based management.** Owner/admin can create/edit/delete agents; member/viewer cannot see management actions; permission lookup failure defaults the list to `member`.
- [x] **AGENT-03 — creates a valid agent.** `/dashboard/agents/new` starts its owner/admin lookup without a permission-loading or form-disabled state, then redirects on denied/error. Submission requires name/system prompt/avatar/model/temperature, sets the only page `loading` state, disables/shows the submit spinner, and returns to the list on success while retaining the form on error.
- [x] **AGENT-04 — edits an existing agent.** `/dashboard/agents/:agentId/edit` loads and populates the form, applies model/temperature defaults, redirects on permission/fetch failure, and saves a partial agent update.
- [x] **AGENT-05 — renders agent chat states.** `/dashboard/agents/:agentId/chat` loads agent and sessions independently, opens the first session, renders no-session/no-message states, and exposes fetch/create/delete plus stream transport/parse errors without corrupting the active selection; message-level stream errors follow `CHAT-05` completion behavior.
- [x] **AGENT-06 — cancels an active stream.** Navigating away/unmounting while an agent response is streaming unsubscribes and closes the underlying `EventSource`; no later token/citation/error updates the page.
- [x] **AGENT-07 — deletes an agent deliberately.** A confirmed successful delete reloads the list; cancellation sends no request; failure preserves the card and shows a toast.

## Default chat and shared conversation behavior

- [x] **CHAT-01 — renders default chat states.** `/dashboard/chat` loads the active workspace's default agent, then sessions/messages; it renders loading, missing-agent, no-session, and empty-session states distinctly. When sessions exist but search matches none, all groups are blank and Angular renders no dedicated search-empty message.
- [x] **CHAT-02 — switches workspace.** A workspace change reloads the default agent and then its sessions; clearing the workspace immediately clears agent, sessions, active session, and messages.
- [x] **CHAT-03 — manages sessions.** The first returned session opens automatically; create prepends and selects; confirmed delete removes and selects the next available session; deleting the last active session clears messages and selection.
- [x] **CHAT-04 — streams an optimistic message.** Send trims input, blocks duplicate sends while streaming, appends temporary user/assistant messages, appends token text, replaces citations, and reloads persisted messages when the stream completes after `done` or a message-level `error` event.
- [x] **CHAT-05 — distinguishes transport failure from an error event.** JSON parse failure or native `EventSource.onerror` errors the subscription, closes the source, exits streaming, toasts, and replaces the pending assistant body with connection-error text. A parsed `{ type: 'error' }` message is emitted, ignored by the component's `next` handler, then closes/completes the source; completion exits streaming and reloads persisted messages without a toast or fallback.
  - [x] **CHAT-05A — handles transport and parse failure.** Native transport failure or invalid JSON closes/errors, toasts, exits streaming, and replaces pending assistant text with connection-error copy.
  - [x] **CHAT-05B — preserves valid server-error completion.** `{ type: 'error', detail: string }` closes/completes and reloads persisted messages without toast/fallback.
  - [x] **CHAT-05C — handles protocol-invalid events.** Unknown types or malformed known variants close as protocol errors and use the same toast/fallback path as transport/parse failure.
- [x] **CHAT-06 — preserves reading position.** Streaming auto-scrolls only while the user remains near the bottom; explicit session load forces an initial scroll to bottom.
- [x] **CHAT-07 — validates stream events.** React accepts only `{ type:'token', text:string }`, `{ type:'citations', citations:Array<{ source_document:string, content:string, score:number|null }> }`, `{ type:'done' }`, or `{ type:'error', detail:string }`. Angular merely parses JSON, ignores unknown types in the component, and leaves that stream open. Approved React policy treats unknown or malformed variants as `CHAT-05C` protocol errors; that policy is distinct from schema validation and is explicit hardening.

A dedicated search-empty message or visible handling for message-level `{ type: 'error' }` would be React hardening and must not be attributed to the Angular behavior frozen by `CHAT-01`/`CHAT-05`.

## Knowledge graph

- [x] **GRAPH-01 — renders graph route states.** `/dashboard/knowledge/graph` shows the full-canvas loading overlay, initializes nodes/edges on success, shows the dedicated upload prompt for an empty graph, and clears graph/selection with a toast on failure.
- [x] **GRAPH-02 — supports graph exploration.** Canvas nodes/edges can be selected, blank canvas deselects, search suggestions focus a node, wheel zoom is bounded, view drag/node drag work, and reset fits the graph.
  - [x] **GRAPH-02A — selects graph entities.** Visible nodes/edges can be selected and blank canvas deselects.
  - [x] **GRAPH-02B — pans, zooms, and drags.** Wheel zoom is bounded; view drag and node drag update the canvas interaction state.
  - [x] **GRAPH-02C — searches and resets.** Search suggestions focus a node and reset fits the graph.
- [x] **GRAPH-03 — records filtered graph simulation precisely.** Angular hides nonmatching nodes/edges when drawing and filters repulsion/springs to the visible topology, but gravity/integration still iterate all nodes and edge-particle updates still iterate all edges. React may preserve this mixed behavior for parity; fully isolating hidden elements from simulation is approved hardening.
- [x] **GRAPH-04 — clears selection when filters hide a node.** Changing the type filter so the selected node (or either endpoint of a selected edge) is hidden closes and clears the detail panel rather than retaining invisible context.
- [x] **GRAPH-05 — handles workspace change.** A new active workspace reloads graph data; clearing the workspace empties nodes/edges and clears selected node/edge.
- [x] **GRAPH-06 — cleans up graph resources.** Unmount cancels the animation frame and removes the same resize listener; no canvas drawing continues after navigation.

`GRAPH-04` is an explicit migration hardening requirement: current Angular rendering filters the canvas but leaves the selected signal populated. The React target must satisfy the acceptance behavior above instead of preserving that stale hidden selection.

## Transport and typed-contract gates

- [x] **API-01 — attaches authentication headers.** Every `/api/` JSON request made with a Firebase user carries a fresh bearer token unless explicitly supplied.
- [x] **API-02 — attaches workspace headers.** Workspace-scoped JSON requests carry the active/explicit `X-Workspace-ID`, with path and header referring to the same workspace.
- [x] **API-03 — handles connection loss and recovery.** Status `0` opens the connection modal, blocked requests remain quiet, health/auth sync can probe recovery, and a successful bypass request closes the modal.
- [x] **API-04 — handles server and auth errors.** `5xx` displays the translated server toast; non-sync `401` performs AUTH-06; local subscribers still receive errors where the interceptor rethrows.
- [x] **API-05 — validates workspace selection without changing ordering.** React validates nested `UserItemResponse`: strings `code`, `message`, `id`, `firebase_uid`, `email`, `full_name`; boolean `is_active`; `login_providers` containing only `email_password | google | facebook`; nullable strings `avatar_url`, `current_workspace_id`. Angular writes signal/storage before the request and retains them on failure. Only automatic initialization applies the validated returned user to the auth profile after success; sidebar selection ignores that payload.
- [x] **API-06 — preserves SSE transport constraints securely.** Native `EventSource` sends encoded message and Firebase token in the query and workspace in the path; it sends neither authorization nor workspace headers, and closes on done/error/unsubscribe. Proxy/application logging redacts the `token` query parameter until header-authenticated React streaming removes query-string credentials.

Waiting for current-workspace API success before applying local selection, or rolling local selection back on failure, would be React hardening rather than `API-05` Angular parity.

## Inventory verification

Run from the repository root:

```bash
rg -n "path:\s*'|redirectTo:" frontend/src/app --glob '*routes.ts' --glob 'app.routes.ts'
rg -n "http\.(get|post|put|delete)|new EventSource" frontend/src/app --glob '*.ts'

# Stable acceptance IDs are unique, and every explicit ID used by the route table is defined.
rg -o '^\s*- \[x\] \*\*[A-Z]+-[0-9]{2}[A-Z]?' docs/migrations/angular-to-react/acceptance-checklist.md \
  | rg -o '[A-Z]+-[0-9]{2}[A-Z]?' | sort | uniq -d | awk 'NF { exit 1 }'
test "$(rg -o '^\s*- \[x\] \*\*[A-Z]+-[0-9]{2}[A-Z]?' docs/migrations/angular-to-react/acceptance-checklist.md | wc -l | tr -d ' ')" -eq 74
! rg -n '^\s*- \[ \] \*\*[A-Z]+-[0-9]{2}[A-Z]?' docs/migrations/angular-to-react/acceptance-checklist.md
for id in $(sed -n '/^| `\//p' docs/migrations/angular-to-react/route-parity.md \
  | rg -o '[A-Z]+-[0-9]{2}[A-Z]?' | sort -u); do
  rg -q "\*\*$id —" docs/migrations/angular-to-react/acceptance-checklist.md || exit 1
done
! sed -n '/^| `\//p' docs/migrations/angular-to-react/route-parity.md \
  | rg '[A-Z]+-[0-9]{2}–[A-Z]+-[0-9]{2}'

# No unresolved contract placeholders or stale parity claims remain.
! rg -n 'typed contract requir[e]d|backend-agreed typ[e]|physics and drawing operate on the visible topolog[y]|workspace-dependent pages do not issue malformed request[s]' \
  docs/migrations/angular-to-react/{route-parity,api-contracts,acceptance-checklist}.md
```

Acceptance inventory status:

- [x] Every route/redirect match maps to a row in `route-parity.md` and at least one stable ID above.
- [x] Every HTTP/EventSource match maps to an operation row in `api-contracts.md`.
- [x] The line-broken auth-sync `.post` call, which the exact HTTP regex does not match, is still documented.
- [x] Stable acceptance definitions are unique and every route-table ID is listed explicitly and resolves to its independently defined acceptance item.
- [x] The unresolved-phrase scan exits successfully.
- [x] Task 14 changes are confined to React implementation/tests/config, CI, and migration parity documentation.
- [x] No Angular product source was modified.

## Baseline verification exception

Before this contract task, Angular TypeScript typecheck passed. Angular build/test are not valid migration gates at this baseline because both encounter the pre-existing esbuild deadlock. The approved exception is to continue while recording that limitation; this task does not claim to fix or reclassify it. React implementation tasks must add independently runnable React checks rather than treating the deadlock as a blanket waiver.
