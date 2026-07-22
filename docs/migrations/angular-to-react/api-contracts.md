# Angular frontend API contracts

This inventory freezes every backend interaction used by the Angular frontend. URLs are relative to `API_BASE`, which is `http://localhost:8000/api/v1` in the checked-in development environment.

## Shared transport contract

- Normal JSON APIs return `ApiResponse<T> = { code: string; message: string; data: T | null }`. Services normally unwrap `data` before exposing it to pages.
- For any request whose URL contains `/api/`, `authInterceptor` obtains a fresh Firebase ID token and adds `Authorization: Bearer <firebase-id-token>` unless the request already supplied that header.
- The same interceptor adds `X-Workspace-ID: <active-workspace-id>` when an active workspace exists, unless the request already supplied the header. “Automatic/optional” below describes that implementation behavior; “explicit/required” means the service sets it from its method argument.
- An HTTP status of `0` opens the blocking connection modal. A `5xx` shows the global server-error toast. A `401` (except auth sync) resets auth, signs out of Firebase, warns the user, and redirects to `/auth/login` with `returnUrl`. The original error is then rethrown for local handling.
- Once the connection modal marks the server down, non-bypass requests complete without a value until a health/auth-sync request proves recovery. Callers must tolerate completion without `next`.
- In the tables, **Global errors** means the interceptor behavior above plus propagation to the page/service subscriber.

## Authentication and infrastructure

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states | Angular source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sync Firebase user | `POST /auth/sync-user` | Explicit `Bearer <firebase-id-token>` | Automatic/optional; normally absent during startup | `SyncUserPayload` (`email`, `full_name`, optional/null `avatar_url`, `login_provider`) | `User`; missing/null `data` throws `Sync user failed...` | Global errors; sync failure is logged and retained for auth-state retry; guard readiness is released after initial attempt | `auth-api.service.ts` |
| Probe backend health | `GET /health` | Automatic when a Firebase user exists; not semantically required | Automatic/optional | None | Raw `{ status: string }` (not `ApiResponse`) | Status `0` is handled by `ConnectionModalService`; the HTTP error interceptor deliberately bypasses health handling | `connection-modal.service.ts` |

## Workspace, membership, invitations, and OAuth

All response cells below are wrapped as `ApiResponse<T>` on the wire and unwrapped by `WorkspaceApiService`.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List workspaces | `GET /workspaces` | Bearer via interceptor | Automatic/optional | None | `Workspace[]` (currently cast; null is not normalized) | Global errors; dashboard ends sync state and leaves existing/empty workspace state |
| Create manual workspace | `POST /workspaces/manual` | Bearer via interceptor | Automatic/optional | `{ name: string }` | `Workspace` (currently cast) | Global errors; settings stops saving and alerts failure |
| Update workspace | `PUT /workspaces/:workspaceId` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ name: string }` | `Workspace` (currently cast) | Global errors; settings stops saving and alerts failure |
| List members | `GET /workspaces/:workspaceId/members` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | `WorkspaceMember[]` | Global errors; members page stops loading; agent permission lookup falls back to `member` or redirects |
| List pending invitations | `GET /workspaces/:workspaceId/invitations` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | `WorkspaceInvitation[]` | Global errors; members page logs and retains the current invitation list |
| Invite member | `POST /workspaces/:workspaceId/invitations` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ email: string; role: WorkspaceRole }` | `WorkspaceInvitation` | Global errors; invitation modal remains available and alerts backend/fallback message |
| Accept invitation | `POST /workspaces/invitations/accept` | Bearer via interceptor | Automatic/optional | `{ token: string }` | `Workspace` | Global errors; invalid/expired token alerts then redirects to `/dashboard` |
| Update member role/status | `PUT /workspaces/:workspaceId/members/:userUid` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ role: WorkspaceRole; status: WorkspaceMemberStatus }` | `WorkspaceMember` | Global errors; local list is unchanged and an alert shows backend/fallback message |
| Remove member | `DELETE /workspaces/:workspaceId/members/:userUid` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | `boolean` (`!!data`) | Global errors; local list changes only when response is truthy |
| Select current workspace | `PUT /users/current-workspace` | Bearer via interceptor | Automatic active workspace, if set | `{ workspace_id: string }` | **`any` — typed contract required** | Global errors; automatic selection logs failure and keeps the local selection |
| Get OAuth URL | `POST /workspaces/oauth/url` | Bearer via interceptor | Automatic/optional | `{ platform: string; redirect_uri?: string }` | `{ oauth_url: string }` | Global errors; caller handles propagated error |
| Complete OAuth callback | `POST /workspaces/oauth/callback` | Bearer via interceptor | Automatic/optional | `{ code: string; state?: string; platform?: string }` | `Workspace` | Global errors; caller handles propagated error |

There is no Angular HTTP call for revoking a pending invitation. `WorkspaceMembersComponent` only removes it from local UI state; React must not invent a backend DELETE contract during parity work.

## Knowledge base, ingestion, and graph

All knowledge operations require both the Firebase bearer token and an explicit `X-Workspace-ID`.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List documents | `GET /knowledge-base` | Bearer via interceptor | Explicit/required | None | `KnowledgeDocument[]`; null becomes `[]` | Global errors; page clears documents and exits loading |
| Upload document | `POST /knowledge-base/upload` | Bearer via interceptor | Explicit/required | `multipart/form-data`: `file`, `title`, optional `description` | `KnowledgeDocument`; missing/null `data` throws | Global/missing-data errors; modal remains available and shows detail/message fallback |
| Create manual document | `POST /knowledge-base/manual` | Bearer via interceptor | Explicit/required | `ManualDocumentPayload` (`title`, optional `description`, `content_text`) | `KnowledgeDocument`; missing/null `data` throws | Global/missing-data errors; modal remains available and shows detail/message fallback |
| Get one document | `GET /knowledge-base/:docId` | Bearer via interceptor | Explicit/required | None | `KnowledgeDocument`; missing/null `data` throws `Document not found` | Global/not-found errors; caller handles propagated error |
| Delete document | `DELETE /knowledge-base/:docId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | Global errors; local document/detail selection changes only on truthy response |
| Retry ingestion | `POST /knowledge-base/:docId/retry` | Bearer via interceptor | Explicit/required | Empty object `{}` | `KnowledgeDocument`; missing/null `data` throws | Global/missing-data errors; failed document remains unchanged and an error toast is shown |
| Get ingestion status | `GET /knowledge-base/:docId/status` | Bearer via interceptor | Explicit/required | None | **`any` — typed contract required** | Global errors; current pages do not call this service method directly |
| Get knowledge graph | `GET /knowledge-base/graph` | Bearer via interceptor | Explicit/required | None | `KnowledgeGraphData`; null becomes `{ nodes: [], edges: [] }` | Global errors; graph and selection are cleared and an error toast is shown |

`KnowledgeDocument.status` is `pending | processing | completed | failed`. The list polls the document collection every five seconds only while at least one item is pending/processing, a workspace is active, and the server is not marked down. Polling stops when no work remains and must be cancelled on unmount.

## Topics

Topic URLs carry the workspace ID in the path. The interceptor also supplies the active workspace header when available; the current service does not explicitly set it. React parity must keep the path and header aligned.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List/search topics | `GET /workspaces/:workspaceId/topics?query&status&limit&offset` | Bearer via interceptor | Automatic active workspace | Optional encoded `query`, `status`, `limit`, `offset` | `Topic[]`; null becomes `[]` | Global errors; list stops loading and shows translated fetch-error toast |
| Get topic | `GET /workspaces/:workspaceId/topics/:topicIdOrSlug` | Bearer via interceptor | Automatic active workspace | None | `TopicDetailResponse`; missing/null `data` throws | Global/not-found errors; detail toasts and returns to topic list |
| Update topic | `PUT /workspaces/:workspaceId/topics/:topicId` | Bearer via interceptor | Automatic active workspace | `Partial<Topic>`; current UI sends `{ name, status }` | **`any` — typed contract required**; missing/null `data` throws | Global/missing-data errors; editor remains open and shows save-error toast |
| Merge topics | `POST /workspaces/:workspaceId/topics/merge` | Bearer via interceptor | Automatic active workspace | `{ target_topic_id: string; source_topic_ids: string[] }` | `boolean` (`!!data`) | Global errors; dialog closes, list remains, and merge-error toast is shown |
| Re-summarize topic | `POST /workspaces/:workspaceId/topics/:topicId/re-summarize` | Bearer via interceptor | Automatic active workspace | Empty object `{}` | `boolean` (`!!data`) | Global errors; page remains and shows re-summary error toast |

## Agents, sessions, messages, default agent, and streaming

The JSON endpoints use `/workspaces/:workspaceId/agents` and explicitly send the active workspace as `X-Workspace-ID`. If the store has no workspace, current Angular URL/header construction can produce `null`/empty IDs; route acceptance prevents calls until a workspace is selected.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List agents | `GET /workspaces/:workspaceId/agents` | Bearer via interceptor | Explicit/required | None | `Agent[]` (currently cast; null is not normalized) | Global errors; list stops loading and toasts |
| Get agent | `GET /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | None | `Agent` (currently cast) | Global errors; config/chat pages toast and redirect to agent list |
| Create agent | `POST /workspaces/:workspaceId/agents` | Bearer via interceptor | Explicit/required | `Agent` | `Agent` | Global errors; form remains and toasts |
| Update agent | `PUT /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | `Partial<Agent>` | `Agent` | Global errors; form remains and toasts |
| Delete agent | `DELETE /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | Global errors; confirmed delete leaves list unchanged and toasts on failure |
| List sessions | `GET /workspaces/:workspaceId/agents/:agentId/sessions` | Bearer via interceptor | Explicit/required | None | `ChatSession[]` | Global errors; session loading stops and toasts |
| Create session | `POST /workspaces/:workspaceId/agents/:agentId/sessions` | Bearer via interceptor | Explicit/required | `{ title: string | undefined }` | `ChatSession` | Global errors; create state resets and toasts |
| Delete session | `DELETE /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | Global errors; local session selection changes only after success |
| List messages | `GET /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId/messages` | Bearer via interceptor | Explicit/required | None | `ChatMessage[]` | Global errors; message loading stops and toasts |
| Get default agent | `GET /workspaces/:workspaceId/agents/default` | Bearer via interceptor | Explicit/required | None | `Agent` | Global errors; default chat exits loading and shows missing-agent state/toast |
| Stream chat | `GET /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId/stream?message=<encoded>&token=<firebase-token>` via `EventSource` | **No authorization header**; Firebase token is a query parameter because native `EventSource` cannot set the header | **No header**; workspace is in the URL path | Query `message` and `token` | **Parsed JSON `any` events — typed contract required** | Missing Firebase user throws before connection; JSON parse/network/server `error` closes stream and errors observer; `done`/event `error` closes and completes; unsubscribe closes active source |

The UI currently recognizes streaming events with shapes equivalent to `{ type: 'token', text: string }`, `{ type: 'citations', citations: Citation[] }`, `{ type: 'done' }`, and `{ type: 'error', ...unknown }`. Those inferred shapes are not yet enforced by TypeScript.

## Required typed-contract work

These four gaps are migration blockers for a type-safe React data layer; do not carry their `any` types forward:

| Gap | Current declaration | Required action |
| --- | --- | --- |
| Ingestion status | `Observable<any>` / `ApiResponse<any>` | Define the status payload, including status/progress/error fields actually returned by the backend. |
| Topic update | `Observable<any>` / `ApiResponse<any>` | Define whether the endpoint returns the updated `Topic`, an acknowledgement, or another envelope. |
| Workspace selection | `Observable<any>` / `ApiResponse<any>` | Define the selected-workspace acknowledgement/user payload. |
| Streaming events | `Observable<any>` and unchecked `JSON.parse` | Introduce a discriminated `ChatStreamEvent` union and validate parsed SSE data before dispatch. |

## Referenced response models

- `User`: database/Firebase identifiers, email/name/avatar, active flag, login providers, optional current workspace.
- `Workspace`, `WorkspaceMember`, and `WorkspaceInvitation`: identifiers, roles/statuses, ownership/inviter metadata, and timestamps as defined in `core/models/workspace.model.ts`.
- `KnowledgeDocument`: type/status, source metadata, ingestion counts/errors/timing, uploader, and timestamps. `KnowledgeGraphData` is `{ nodes: GraphNode[]; edges: GraphEdge[] }`.
- `TopicDetailResponse` extends `Topic` with `members: MemberDetail[]`; merge input identifies one target and one-or-more sources.
- `Agent`, `ChatSession`, `ChatMessage`, and `Citation` are defined in `features/agents/models/agent.model.ts`.

## Inventory traceability

Every `http.get/post/put/delete` and `new EventSource` match from the required inventory command maps to one row above. `AuthApiService.syncUser` is also included even though its line-broken `.post` call is not matched by that exact regular expression.
