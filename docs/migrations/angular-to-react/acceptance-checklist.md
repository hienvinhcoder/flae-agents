# Angular to React behavior acceptance checklist

These stable IDs define migration acceptance. Tests may be component, integration, or end-to-end tests, but each ID must remain independently reportable. Unless stated otherwise, all backend calls use the contracts in `api-contracts.md` and all authenticated routes render in the dashboard layout.

## Routing and shell

- [ ] **ROUTE-01 — redirects the root URL.** Visiting `/` replaces/navigates to `/auth/login` and does not render dashboard content.
- [ ] **ROUTE-02 — redirects the auth index.** A guest visiting `/auth` lands on `/auth/login`; an authenticated user visiting `/auth`, `/auth/login`, or `/auth/register` lands on `/dashboard` only after auth readiness.
- [ ] **ROUTE-03 — redirects the dashboard index.** An authenticated user visiting `/dashboard` lands on `/dashboard/briefing`; a guest is sent to `/auth/login?returnUrl=%2Fdashboard`.
- [ ] **ROUTE-04 — renders the briefing placeholder.** `/dashboard/briefing` renders the Angular-equivalent “under development” briefing state inside the dashboard shell.
- [ ] **ROUTE-05 — renders the inbox placeholder.** `/dashboard/inbox` renders the Angular-equivalent “under development” inbox state inside the dashboard shell.
- [ ] **ROUTE-06 — renders the reports placeholder.** `/dashboard/reports` renders the Angular-equivalent “under development” reports state inside the dashboard shell.
- [ ] **ROUTE-07 — preserves unknown-route behavior intentionally.** Because Angular defines no wildcard route, the React router must not silently redirect unknown URLs; any not-found page is a separately approved change.

## Authentication

- [ ] **AUTH-01 — restores Firebase session.** App initialization waits for Firebase redirect handling and `authStateReady`, obtains the restored user's token, calls auth sync, stores the database user, then releases route guards without a false login redirect.
- [ ] **AUTH-02 — signs in and returns to the requested route.** Email/password sign-in sets loading until Firebase returns, then clears it before backend sync; navigation waits for the synced database user and honors the captured `returnUrl` (default `/dashboard`). Google popup sign-in sets loading but has no success callback, so successful navigation occurs after sync while the shared loading flag remains true. Either path clears loading in its error handler.
  - [ ] **AUTH-02A — signs in with email/password.** Firebase success clears loading before backend sync; the synced user triggers the captured/default navigation.
  - [ ] **AUTH-02B — signs in with Google.** Popup success relies on auth-state sync/navigation and leaves Angular's shared loading flag true; cancellation/error clears it.
- [ ] **AUTH-03 — registers a user.** Registration sets loading until Firebase returns, clears it before backend sync, then routes after the synced database user reaches the store; duplicate email, weak password, and fallback failures clear loading and render the mapped inline error.
- [ ] **AUTH-04 — reports login failures.** Wrong password/user-not-found/invalid credential share the invalid-credentials message; a closed Google popup has the cancellation message; leaving the auth page clears stale errors and subscriptions.
- [ ] **AUTH-05 — logs out completely.** Logout resets auth state, workspace state, and persisted active workspace, then navigates to `/auth/login`; a failed logout stops loading and exposes an error.
- [ ] **AUTH-06 — reacts to session expiry.** A backend `401` resets auth, signs out of Firebase, shows the expiry warning, and routes to login with the current URL as `returnUrl`; an auth-state transition to null does the equivalent redirect.

Keeping auth loading active through backend sync and clearing the Google success state are potential React hardening changes, not requirements of `AUTH-02`/`AUTH-03` Angular parity.

## Workspaces, settings, membership, invitations, and OAuth

- [ ] **WS-01 — renders workspace settings states.** `/dashboard/settings` defaults to General, `?mode=create` opens create mode, Members clears create mode, save/invite actions expose loading, and member/invitation lists render explicit empty states.
- [ ] **WS-02 — restores and synchronizes workspace selection.** After workspace loading, selection precedence is valid local storage ID, user profile ID, then first workspace; zero workspaces clears selection. Automatic initialization writes signal/storage before the current-workspace request and applies the returned user to the auth profile only after success. Sidebar changes also write signal/storage before the request but never apply its returned user to the profile. Either path logs failure and retains the local selection.
- [ ] **WS-03 — rejects an expired invite.** `/invite?token=<expired>` shows processing only while submitting, displays the backend/fallback expiration error, does not add/select a workspace, and returns to `/dashboard`. A missing token follows the invalid-token redirect without sending a request.
- [ ] **WS-04 — accepts or declines an invite.** Acceptance adds and selects the returned workspace, renders success, then routes to Settings after 1.5 seconds; confirmed decline performs no API mutation and returns to the dashboard.
- [ ] **WS-05 — enforces membership actions.** Only owner/admin users can invite and manage allowed member fields; successful role/status/remove/invite operations update local lists, while failures preserve data and surface the backend/fallback error.
  - [ ] **WS-05A — scopes invitation reads and writes.** Active owner/admin can list and create invitations; member/viewer receives `403`; token failure receives `401`.
  - [ ] **WS-05B — enforces role/status ownership rules.** Nobody changes their own role/status; only owner changes owner/admin or transfers ownership; admin changes only member/viewer and cannot promote to owner/admin.
  - [ ] **WS-05C — distinguishes removal UI policy from backend enforcement.** Angular hides all self-management controls. Backend rejects owner removal (`400`) and an admin removing another admin (`403`), but permits an admin to remove itself because the self branch runs first. React may retain a frontend prohibition as Angular-visible policy and defense-in-depth hardening, but must not describe a direct admin self-removal request as backend `403`; changing that server result requires separate backend hardening.
- [ ] **WS-06 — keeps invitation revocation local-only.** Revoking a pending invitation removes it from current UI state without issuing an HTTP request, documenting the current missing backend endpoint.
- [ ] **WS-07 — records the unavailable workspace OAuth contract.** Angular sends the documented URL/callback payloads, but this repository has no matching backend routes; current calls return `404`. React must not claim a successful typed OAuth flow without a separately supplied backend contract.
- [ ] **WS-08 — gates workspace-dependent requests (required React hardening).** Current Angular agent edit and agent-specific chat may issue `/workspaces/null/agents/...` requests with an empty workspace header while selection is absent/loading. React must not start any workspace-dependent query or mutation until it has a validated workspace ID; load failure stops the sync banner and retains existing/empty state without malformed calls.

## Knowledge base and ingestion

- [ ] **KB-01 — renders the knowledge route.** `/dashboard/knowledge` fetches for the active workspace, displays table loading, then renders documents or the dedicated no-results state; workspace changes reload and no workspace clears the list.
- [ ] **KB-02 — handles document fetch error.** A failed list request exits loading, clears the current documents as Angular does, and allows the global/local error UI to remain usable.
- [ ] **KB-03 — validates and uploads a document.** Upload requires a selected workspace, file, title, supported PDF/MD/TXT format, and at most 50 MB. Angular incorrectly prepends the sparse `DocumentUploadResponse` as a complete document; React validates that sparse result, refetches/list-normalizes before storing a full row, closes/toasts, and starts polling. Failure retains the modal and displays detail/message fallback.
- [ ] **KB-04 — creates a manual document.** Valid title/content posts the manual payload. Angular incorrectly prepends the sparse response; React validates it and refetches/list-normalizes before storing a full document, then closes/toasts and starts polling. Failure resets saving and preserves input.
- [ ] **KB-05 — retries failed ingestion.** Retrying disables the action. Angular replaces the list/detail object with the sparse response; React validates it and refetches/list-normalizes before replacing full document state, then toasts and resumes polling. Failure preserves the failed document and displays an error.
- [ ] **KB-06 — deletes a document and selection.** Confirmed successful deletion removes the document and closes/clears its detail panel; a false/error response leaves both list and selection intact and exits processing.
- [ ] **KB-07 — polls only active ingestion.** Poll every five seconds only with pending/processing documents, an active workspace, and a reachable server; refresh the open detail from returned data; stop when no work remains.
- [ ] **KB-08 — cleans up knowledge effects.** Navigating away cancels the polling interval and no later result mutates an unmounted React page.
- [ ] **KB-09 — validates knowledge mutation and ingestion contracts.** Upload/manual/retry require `{ id: UUID string, title: string, status: pending|processing|completed|failed, temporal_workflow_id: string|null }`. Status requires `{ document_id: UUID string, status, error_message: string|null, chunk_count: integer|null, entity_count: integer|null, relation_count: integer|null, processing_time_seconds: number|null }`. Invalid data is a contract error; HTTP `404` remains an error rather than a status value.

## Topics

- [ ] **TOPIC-01 — renders topic list states.** `/dashboard/topics` shows fetch loading, topic cards on success, and the dedicated empty/no-filter-results state; fetch errors exit loading and show the translated toast.
- [ ] **TOPIC-02 — filters topics.** Status filtering is immediate; name/summary search is case-insensitive and applies after the 300 ms debounce.
- [ ] **TOPIC-03 — cleans up topic search.** Replacing a search cancels the prior timer, and unmount cancels the pending timer so it cannot update the unmounted page.
- [ ] **TOPIC-04 — merges selected topics.** The merge action is disabled with fewer than two topics; the dialog requires one target and at least one different source, resets sources when target changes, submits all selected source IDs, closes, reloads on success, and exposes an error without losing the list on failure.
- [ ] **TOPIC-05 — renders topic detail states.** `/dashboard/topics/:id` reloads when route ID or workspace changes, shows detail loading, renders summary/member-tab empty states, and returns to `/dashboard/topics` with a toast on missing/error.
- [ ] **TOPIC-06 — edits and re-summarizes a topic.** Blank names are rejected; save sends name/status, reloads the detail on success, and retains edit state on failure; re-summarize disables concurrent actions and reports success/failure.
- [ ] **TOPIC-07 — validates topic update.** Although the endpoint response model is `Any`, the service returns five required strings: `workspace_id`, `topic_id`, `name`, `slug`, and `status`. React validates all five and narrows `status` to its supported enum before updating domain state; missing/unsupported data is a contract error.

## Agents and agent-specific chat

- [ ] **AGENT-01 — renders agent list states.** `/dashboard/agents` shows loading, a dedicated empty card, or agent cards; fetch failure exits loading and toasts; a workspace change reloads the list.
- [ ] **AGENT-02 — applies role-based management.** Owner/admin can create/edit/delete agents; member/viewer cannot see management actions; permission lookup failure defaults the list to `member`.
- [ ] **AGENT-03 — creates a valid agent.** `/dashboard/agents/new` starts its owner/admin lookup without a permission-loading or form-disabled state, then redirects on denied/error. Submission requires name/system prompt/avatar/model/temperature, sets the only page `loading` state, disables/shows the submit spinner, and returns to the list on success while retaining the form on error.
- [ ] **AGENT-04 — edits an existing agent.** `/dashboard/agents/:agentId/edit` loads and populates the form, applies model/temperature defaults, redirects on permission/fetch failure, and saves a partial agent update.
- [ ] **AGENT-05 — renders agent chat states.** `/dashboard/agents/:agentId/chat` loads agent and sessions independently, opens the first session, renders no-session/no-message states, and exposes fetch/create/delete plus stream transport/parse errors without corrupting the active selection; message-level stream errors follow `CHAT-05` completion behavior.
- [ ] **AGENT-06 — cancels an active stream.** Navigating away/unmounting while an agent response is streaming unsubscribes and closes the underlying `EventSource`; no later token/citation/error updates the page.
- [ ] **AGENT-07 — deletes an agent deliberately.** A confirmed successful delete reloads the list; cancellation sends no request; failure preserves the card and shows a toast.

## Default chat and shared conversation behavior

- [ ] **CHAT-01 — renders default chat states.** `/dashboard/chat` loads the active workspace's default agent, then sessions/messages; it renders loading, missing-agent, no-session, and empty-session states distinctly. When sessions exist but search matches none, all groups are blank and Angular renders no dedicated search-empty message.
- [ ] **CHAT-02 — switches workspace.** A workspace change reloads the default agent and then its sessions; clearing the workspace immediately clears agent, sessions, active session, and messages.
- [ ] **CHAT-03 — manages sessions.** The first returned session opens automatically; create prepends and selects; confirmed delete removes and selects the next available session; deleting the last active session clears messages and selection.
- [ ] **CHAT-04 — streams an optimistic message.** Send trims input, blocks duplicate sends while streaming, appends temporary user/assistant messages, appends token text, replaces citations, and reloads persisted messages when the stream completes after `done` or a message-level `error` event.
- [ ] **CHAT-05 — distinguishes transport failure from an error event.** JSON parse failure or native `EventSource.onerror` errors the subscription, closes the source, exits streaming, toasts, and replaces the pending assistant body with connection-error text. A parsed `{ type: 'error' }` message is emitted, ignored by the component's `next` handler, then closes/completes the source; completion exits streaming and reloads persisted messages without a toast or fallback.
  - [ ] **CHAT-05A — handles transport and parse failure.** Native transport failure or invalid JSON closes/errors, toasts, exits streaming, and replaces pending assistant text with connection-error copy.
  - [ ] **CHAT-05B — preserves valid server-error completion.** `{ type: 'error', detail: string }` closes/completes and reloads persisted messages without toast/fallback.
  - [ ] **CHAT-05C — handles protocol-invalid events.** Unknown types or malformed known variants close as protocol errors and use the same toast/fallback path as transport/parse failure.
- [ ] **CHAT-06 — preserves reading position.** Streaming auto-scrolls only while the user remains near the bottom; explicit session load forces an initial scroll to bottom.
- [ ] **CHAT-07 — validates stream events.** React accepts only `{ type:'token', text:string }`, `{ type:'citations', citations:Array<{ source_document:string, content:string, score:number|null }> }`, `{ type:'done' }`, or `{ type:'error', detail:string }`. Angular merely parses JSON, ignores unknown types in the component, and leaves that stream open. Approved React policy treats unknown or malformed variants as `CHAT-05C` protocol errors; that policy is distinct from schema validation and is explicit hardening.

A dedicated search-empty message or visible handling for message-level `{ type: 'error' }` would be React hardening and must not be attributed to the Angular behavior frozen by `CHAT-01`/`CHAT-05`.

## Knowledge graph

- [ ] **GRAPH-01 — renders graph route states.** `/dashboard/knowledge/graph` shows the full-canvas loading overlay, initializes nodes/edges on success, shows the dedicated upload prompt for an empty graph, and clears graph/selection with a toast on failure.
- [ ] **GRAPH-02 — supports graph exploration.** Canvas nodes/edges can be selected, blank canvas deselects, search suggestions focus a node, wheel zoom is bounded, view drag/node drag work, and reset fits the graph.
  - [ ] **GRAPH-02A — selects graph entities.** Visible nodes/edges can be selected and blank canvas deselects.
  - [ ] **GRAPH-02B — pans, zooms, and drags.** Wheel zoom is bounded; view drag and node drag update the canvas interaction state.
  - [ ] **GRAPH-02C — searches and resets.** Search suggestions focus a node and reset fits the graph.
- [ ] **GRAPH-03 — records filtered graph simulation precisely.** Angular hides nonmatching nodes/edges when drawing and filters repulsion/springs to the visible topology, but gravity/integration still iterate all nodes and edge-particle updates still iterate all edges. React may preserve this mixed behavior for parity; fully isolating hidden elements from simulation is approved hardening.
- [ ] **GRAPH-04 — clears selection when filters hide a node.** Changing the type filter so the selected node (or either endpoint of a selected edge) is hidden closes and clears the detail panel rather than retaining invisible context.
- [ ] **GRAPH-05 — handles workspace change.** A new active workspace reloads graph data; clearing the workspace empties nodes/edges and clears selected node/edge.
- [ ] **GRAPH-06 — cleans up graph resources.** Unmount cancels the animation frame and removes the same resize listener; no canvas drawing continues after navigation.

`GRAPH-04` is an explicit migration hardening requirement: current Angular rendering filters the canvas but leaves the selected signal populated. The React target must satisfy the acceptance behavior above instead of preserving that stale hidden selection.

## Transport and typed-contract gates

- [ ] **API-01 — attaches authentication headers.** Every `/api/` JSON request made with a Firebase user carries a fresh bearer token unless explicitly supplied.
- [ ] **API-02 — attaches workspace headers.** Workspace-scoped JSON requests carry the active/explicit `X-Workspace-ID`, with path and header referring to the same workspace.
- [ ] **API-03 — handles connection loss and recovery.** Status `0` opens the connection modal, blocked requests remain quiet, health/auth sync can probe recovery, and a successful bypass request closes the modal.
- [ ] **API-04 — handles server and auth errors.** `5xx` displays the translated server toast; non-sync `401` performs AUTH-06; local subscribers still receive errors where the interceptor rethrows.
- [ ] **API-05 — validates workspace selection without changing ordering.** React validates nested `UserItemResponse`: strings `code`, `message`, `id`, `firebase_uid`, `email`, `full_name`; boolean `is_active`; `login_providers` containing only `email_password | google | facebook`; nullable strings `avatar_url`, `current_workspace_id`. Angular writes signal/storage before the request and retains them on failure. Only automatic initialization applies the validated returned user to the auth profile after success; sidebar selection ignores that payload.
- [ ] **API-06 — preserves SSE transport constraints securely.** Native `EventSource` sends encoded message and Firebase token in the query and workspace in the path; it sends neither authorization nor workspace headers, and closes on done/error/unsubscribe. Proxy/application logging redacts the `token` query parameter until header-authenticated React streaming removes query-string credentials.

Waiting for current-workspace API success before applying local selection, or rolling local selection back on failure, would be React hardening rather than `API-05` Angular parity.

## Inventory verification

Run from the repository root:

```bash
rg -n "path:\s*'|redirectTo:" frontend/src/app --glob '*routes.ts' --glob 'app.routes.ts'
rg -n "http\.(get|post|put|delete)|new EventSource" frontend/src/app --glob '*.ts'

# Stable acceptance IDs are unique, and every explicit ID used by the route table is defined.
rg -o '^\s*- \[ \] \*\*[A-Z]+-[0-9]{2}[A-Z]?' docs/migrations/angular-to-react/acceptance-checklist.md \
  | rg -o '[A-Z]+-[0-9]{2}[A-Z]?' | sort | uniq -d | awk 'NF { exit 1 }'
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

Acceptance for this contract-freeze task:

- [ ] Every route/redirect match maps to a row in `route-parity.md` and at least one stable ID above.
- [ ] Every HTTP/EventSource match maps to an operation row in `api-contracts.md`.
- [ ] The line-broken auth-sync `.post` call, which the exact HTTP regex does not match, is still documented.
- [ ] Stable acceptance definitions are unique and every route-table ID is listed explicitly and resolves to its independently defined acceptance item.
- [ ] The unresolved-phrase scan exits successfully.
- [ ] Only the three files under `docs/migrations/angular-to-react/` changed.
- [ ] No Angular product source was modified.

## Baseline verification exception

Before this contract task, Angular TypeScript typecheck passed. Angular build/test are not valid migration gates at this baseline because both encounter the pre-existing esbuild deadlock. The approved exception is to continue while recording that limitation; this task does not claim to fix or reclassify it. React implementation tasks must add independently runnable React checks rather than treating the deadlock as a blanket waiver.
