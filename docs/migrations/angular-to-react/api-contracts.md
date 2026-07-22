# Angular frontend API contracts

This inventory freezes every backend interaction used by the Angular frontend. URLs are relative to `API_BASE`, which is `http://localhost:8000/api/v1` in the checked-in development environment.

## Shared transport contract

- Normal JSON APIs return `ApiResponse<T> = { code: string; message: string; data: T | null }`. Services normally unwrap `data` before exposing it to pages.
- For any request whose URL contains `/api/`, `authInterceptor` obtains a fresh Firebase ID token and adds `Authorization: Bearer <firebase-id-token>` unless the request already supplied that header.
- The same interceptor adds `X-Workspace-ID: <active-workspace-id>` when an active workspace exists, unless the request already supplied the header. “Automatic/optional” below describes that implementation behavior; “explicit/required” means the service sets it from its method argument.
- An HTTP status of `0` opens the blocking connection modal. A `5xx` shows the global server-error toast. A `401` (except auth sync) resets auth, signs out of Firebase, warns the user, and redirects to `/auth/login` with `returnUrl`. The original error is then rethrown for local handling.
- Once the connection modal marks the server down, non-bypass requests complete without a value until a health/auth-sync request proves recovery. Callers must tolerate completion without `next`.
- In the tables, **Global errors** means the interceptor behavior above plus propagation to the page/service subscriber.

## Backend authorization and ownership matrix

Angular action visibility is presentation only. The backend dependencies below remain authoritative even when Angular shows an action to a role that cannot execute it.

| Area | Read scope | Mutation scope | Explicit authentication/authorization outcomes |
| --- | --- | --- | --- |
| Workspaces | `GET /workspaces` returns the authenticated user's active memberships. Member-list reads allow active `owner`, `admin`, `member`, and `viewer`; pending-invitation reads allow `owner`/`admin` only. | Any authenticated synced user may create a workspace and becomes owner. Rename, invite, member role/status changes, and member removal require `owner`/`admin`, with additional ownership rules described below. Invite acceptance requires the signed-in user's email to match. | Missing/invalid/expired bearer token: `401`. Inactive synced user, nonmembership, suspended membership, disallowed role, or invite email mismatch: `403`. Invalid/expired invite tokens otherwise return `400`/`404`. |
| Knowledge | List/detail/status/graph allow every active workspace role through membership validation. | Upload, manual create, delete, and retry require `owner`/`admin`. | Token failure: `401`. Nonmember/suspended member or `member`/`viewer` mutation: `403`. Angular currently shows knowledge mutation actions without a role gate, so backend `403` is expected for those users. |
| Topics | List/detail allow every active workspace role. | Update, merge, and re-summarize require `owner`/`admin`. | Token failure: `401`. Nonmember/suspended member or `member`/`viewer` mutation: `403`. Angular currently shows topic mutation actions without a role gate. |
| Agents | List/get/default allow every active workspace role; default lookup may create a default agent for any active member. | Create/update/delete non-default agents require `owner`/`admin`. | Token failure: `401`. Nonmember/suspended member or `member`/`viewer` mutation: `403`; missing/inactive agent: `404`. Angular hides management actions based on its member lookup, but backend enforcement is definitive. |
| Chat JSON APIs | Every active workspace role may create/list/read/delete its own sessions and read their messages. | Session/message access is restricted by `workspace_id`, `agent_id`, and `created_by == current user`; no role elevation bypasses ownership. | Token failure: `401`; workspace access failure: `403`; a missing or another user's session is deliberately indistinguishable as `404`. |
| Chat SSE | Every active workspace member may open a stream for its own session. | The service validates agent workspace scope and session ownership before saving/streaming. | Missing/invalid query/header token: HTTP `401`; inactive/nonmember workspace access: HTTP `403`. After SSE starts, missing agent or missing/nonowned session is an emitted `{ type: 'error', detail }`, not an HTTP `403`/`404`. |

Member mutation fine-grained rules: users cannot change their own role/status; only the owner can modify an owner/admin or transfer ownership; an admin can modify/remove only member/viewer and cannot promote to admin/owner; the owner cannot be removed. These yield `400`, `403`, or `404` as encoded by `WorkspaceMemberService`.

## Authentication and infrastructure

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states | Angular source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sync Firebase user | `POST /auth/sync-user` | Explicit `Bearer <firebase-id-token>` | Automatic/optional; normally absent during startup | `SyncUserPayload` (`email`, `full_name`, optional/null `avatar_url`, `login_provider`) | `User`; missing/null `data` throws `Sync user failed...` | Global errors; sync failure is logged and retained for auth-state retry; guard readiness is released after initial attempt | `auth-api.service.ts` |
| Probe backend health | `GET /health` | Automatic when a Firebase user exists; not semantically required | Automatic/optional | None | Raw `{ status: string }` (not `ApiResponse`) | Status `0` is handled by `ConnectionModalService`; the HTTP error interceptor deliberately bypasses health handling | `connection-modal.service.ts` |

## Workspace, membership, invitations, and OAuth

All response cells below are wrapped as `ApiResponse<T>` on the wire and unwrapped by `WorkspaceApiService`.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List workspaces | `GET /workspaces` | Bearer via interceptor | Automatic/optional | None | Backend `WorkspaceItemResponse[]`; Angular casts `Workspace[]` | `401` token failure; `403` inactive synced user; backend returns active memberships and auto-creates a default workspace when empty |
| Create manual workspace | `POST /workspaces/manual` | Bearer via interceptor | Automatic/optional | `{ name: string }` | Backend `WorkspaceItemResponse`; Angular casts `Workspace` | `401` token failure; settings stops saving and alerts other failures |
| Update workspace | `PUT /workspaces/:workspaceId` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ name: string }` | Backend `WorkspaceItemResponse`; Angular casts `Workspace` | `401` token failure; `403` nonmember/suspended/member/viewer; settings stops saving and alerts failure |
| List members | `GET /workspaces/:workspaceId/members` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | Backend `WorkspaceMemberResponse[]`; Angular asserts `WorkspaceMember[]` | `401`; `403` nonmember/suspended; all four active roles allowed; page stops loading, and agent role lookup falls back or redirects |
| List pending invitations | `GET /workspaces/:workspaceId/invitations` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | Backend `WorkspaceInvitationResponse[]`; Angular asserts `WorkspaceInvitation[]` and omits wire `token`/expects absent `invited_by_name` | `401` token failure; `403` nonmember/suspended/member/viewer; members page logs and retains current list |
| Invite member | `POST /workspaces/:workspaceId/invitations` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ email: string; role: WorkspaceRole }` | Backend `WorkspaceInvitationResponse`; Angular asserts `WorkspaceInvitation` | `401`; `403` nonmember/suspended/member/viewer; `400` owner-role/already-member; modal retains input on failure |
| Accept invitation | `POST /workspaces/invitations/accept` | Bearer via interceptor | Automatic/optional | `{ token: string }` | Backend `WorkspaceItemResponse`; Angular asserts `Workspace` | `401`; `403` different signed-in email; `400` expired; `404` invalid/already-used; Angular alerts then redirects |
| Update member role/status | `PUT /workspaces/:workspaceId/members/:userUid` | Bearer via interceptor | Explicit/required, same `workspaceId` | `{ role: WorkspaceRole; status: WorkspaceMemberStatus }` | Backend `WorkspaceMemberResponse`; Angular asserts `WorkspaceMember` | `401`; `403` workspace/role/fine-grained denial; `400` self/owner rule; `404` target missing; local list remains unchanged on failure |
| Remove member | `DELETE /workspaces/:workspaceId/members/:userUid` | Bearer via interceptor | Explicit/required, same `workspaceId` | None | `boolean` (`!!data`) | `401`; `403` workspace/role/fine-grained denial; `400` owner removal; `404` target missing; local list changes only when truthy |
| Select current workspace | `PUT /users/current-workspace` | Bearer via interceptor | Automatic active workspace, already set locally | `{ workspace_id: string }` | Backend `UserItemResponse`: string `code`, `message`, `id`, `firebase_uid`, `email`, `full_name`; boolean `is_active`; `LoginProvider[]`; nullable `avatar_url`, `current_workspace_id`; Angular declares `any` | `401`; `403` inactive user or no active membership. Local signal/storage are already changed and retained on failure; automatic initialization copies the validated user on success, sidebar selection ignores it |
| Get OAuth URL | `POST /workspaces/oauth/url` | Bearer via interceptor | Automatic/optional | `{ platform: string; redirect_uri?: string }` | Angular expects `{ oauth_url: string }` | No matching backend route exists in this repository; current call returns `404` rather than an OAuth payload |
| Complete OAuth callback | `POST /workspaces/oauth/callback` | Bearer via interceptor | Automatic/optional | `{ code: string; state?: string; platform?: string }` | Angular expects `Workspace` | No matching backend route exists in this repository; current call returns `404` |

There is no Angular HTTP call for revoking a pending invitation. `WorkspaceMembersComponent` only removes it from local UI state; React must not invent a backend DELETE contract during parity work.

## Knowledge base, ingestion, and graph

All knowledge operations require both the Firebase bearer token and an explicit `X-Workspace-ID`. Reads require active membership at any role; upload/manual/delete/retry additionally require `owner`/`admin`.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List documents | `GET /knowledge-base` | Bearer via interceptor | Explicit/required | None | Backend `DocumentListItem[]`; Angular asserts `KnowledgeDocument[]`; null becomes `[]` | `401`; `403` nonmember/suspended; page clears documents on other errors |
| Upload document | `POST /knowledge-base/upload` | Bearer via interceptor | Explicit/required | `multipart/form-data`: `file`, `title`, optional `description` | Backend **`DocumentUploadResponse` only**: `{ id, title, status, temporal_workflow_id }`; Angular incorrectly asserts `KnowledgeDocument` | `401`; `403` member/viewer/nonmember; `400` invalid input; missing/null data throws; modal remains available on failure |
| Create manual document | `POST /knowledge-base/manual` | Bearer via interceptor | Explicit/required | `ManualDocumentPayload` (`title`, optional `description`, `content_text`) | Backend **`DocumentUploadResponse` only**: `{ id, title, status, temporal_workflow_id }`; Angular incorrectly asserts `KnowledgeDocument` | `401`; `403` member/viewer/nonmember; `400` validation/size; missing/null data throws |
| Get one document | `GET /knowledge-base/:docId` | Bearer via interceptor | Explicit/required | None | Backend `DocumentDetail`; Angular asserts `KnowledgeDocument` | `401`; `403` nonmember/suspended; `404` missing; Angular throws on null data |
| Delete document | `DELETE /knowledge-base/:docId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | `401`; `403` member/viewer/nonmember; `404` missing; local list/detail changes only on truthy response |
| Retry ingestion | `POST /knowledge-base/:docId/retry` | Bearer via interceptor | Explicit/required | Empty object `{}` | Backend **`DocumentUploadResponse` only**: `{ id, title, status, temporal_workflow_id }`; Angular incorrectly asserts `KnowledgeDocument` | `401`; `403` member/viewer/nonmember; `400` invalid retry; `404` missing; missing/null data throws |
| Get ingestion status | `GET /knowledge-base/:docId/status` | Bearer via interceptor | Explicit/required | None | Backend `IngestionStatusResponse`: `{ document_id, status, error_message, chunk_count, entity_count, relation_count, processing_time_seconds }`; Angular declares `any` | `401`; `403` nonmember/suspended; `404` missing; current Angular pages do not call this method |
| Get knowledge graph | `GET /knowledge-base/graph` | Bearer via interceptor | Explicit/required | None | Backend `KnowledgeGraphResponse`; Angular `KnowledgeGraphData`; null becomes `{ nodes: [], edges: [] }` | `401`; `403` nonmember/suspended; backend `500` clears graph/selection and toasts |

`KnowledgeDocument.status` is `pending | processing | completed | failed`. The list polls the document collection every five seconds only while at least one item is pending/processing, a workspace is active, and the server is not marked down. Polling stops when no work remains and must be cancelled on unmount.

Angular prepends upload/manual responses and replaces a retried row as though `DocumentUploadResponse` were a complete `KnowledgeDocument`; fields such as `document_type`, `uploaded_by`, and timestamps are therefore absent until a later list poll/refetch. The approved React outcome is to validate the minimal response, then refetch/list-normalize before writing a full document row. It must not cast the minimal wire object to `KnowledgeDocument`.

## Topics

Topic URLs carry the workspace ID in the path. The interceptor also supplies the active workspace header when available; the current service does not explicitly set it. Reads allow any active role; mutations require `owner`/`admin`. React must keep path and header aligned.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List/search topics | `GET /workspaces/:workspaceId/topics?query&status&limit&offset` | Bearer via interceptor | Automatic active workspace | Optional encoded `query`, `status`, `limit`, `offset` | Backend `TopicListItem[]`; Angular `Topic[]`; null becomes `[]` | `401`; `403` nonmember/suspended; other errors stop loading and toast |
| Get topic | `GET /workspaces/:workspaceId/topics/:topicIdOrSlug` | Bearer via interceptor | Automatic active workspace | None | Backend/Angular `TopicDetailResponse` | `401`; `403` nonmember/suspended; `404` missing; Angular toasts and returns to list |
| Update topic | `PUT /workspaces/:workspaceId/topics/:topicId` | Bearer via interceptor | Automatic active workspace | Backend `TopicUpdate`; current UI sends `{ name, status }` | Backend endpoint declares `Any`, but service concretely returns `{ workspace_id, topic_id, name, slug, status }`; Angular declares `any` | `401`; `403` member/viewer/nonmember; `404` missing; `500` update failure; editor remains open |
| Merge topics | `POST /workspaces/:workspaceId/topics/merge` | Bearer via interceptor | Automatic active workspace | `{ target_topic_id: string; source_topic_ids: string[] }` | `boolean` (`!!data`) | `401`; `403` member/viewer/nonmember; `400` empty/invalid target; `500` failure; dialog closes but list remains |
| Re-summarize topic | `POST /workspaces/:workspaceId/topics/:topicId/re-summarize` | Bearer via interceptor | Automatic active workspace | Empty object `{}` | `boolean` (`!!data`) | `401`; `403` member/viewer/nonmember; `500` failure; page remains and toasts |

## Agents, sessions, messages, default agent, and streaming

The JSON endpoints use `/workspaces/:workspaceId/agents` and explicitly send the active workspace as `X-Workspace-ID`. Current Angular does **not** consistently gate these calls: agent edit and agent-specific chat can request `/workspaces/null/agents/...` with an empty workspace header while the layout is still selecting a workspace. Preventing those malformed calls is required React hardening under `WS-08`, not Angular parity.

| Operation | Method and URL | Authorization | `X-Workspace-ID` | Payload | Unwrapped response | Error states |
| --- | --- | --- | --- | --- | --- | --- |
| List agents | `GET /workspaces/:workspaceId/agents` | Bearer via interceptor | Explicit/required | None | Backend `AgentDetail[]`; Angular `Agent[]` | `401`; `403` nonmember/suspended; all active roles allowed; list errors toast |
| Get agent | `GET /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | None | Backend `AgentDetail`; Angular `Agent` | `401`; `403` nonmember/suspended; `404` missing/inactive; config/chat redirect |
| Create agent | `POST /workspaces/:workspaceId/agents` | Bearer via interceptor | Explicit/required | Backend `AgentCreate`; Angular sends `Agent` | Backend `AgentDetail`; Angular `Agent` | `401`; `403` member/viewer/nonmember; form remains on other errors |
| Update agent | `PUT /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | Backend `AgentUpdate`; Angular sends `Partial<Agent>` | Backend `AgentDetail`; Angular `Agent` | `401`; `403` member/viewer/nonmember; `404` missing; form remains |
| Delete agent | `DELETE /workspaces/:workspaceId/agents/:agentId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | `401`; `403` member/viewer/nonmember; `404` missing; card remains on failure |
| List sessions | `GET /workspaces/:workspaceId/agents/:agentId/sessions` | Bearer via interceptor | Explicit/required | None | `ChatSessionResponse[]`; Angular `ChatSession[]` | `401`; `403` workspace denial; returns only caller-owned sessions |
| Create session | `POST /workspaces/:workspaceId/agents/:agentId/sessions` | Bearer via interceptor | Explicit/required | `{ title: string | undefined }` | `ChatSessionResponse`; Angular `ChatSession` | `401`; `403` workspace denial; `404` agent missing; caller becomes owner |
| Delete session | `DELETE /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId` | Bearer via interceptor | Explicit/required | None | `boolean` (`!!data`) | `401`; `403` workspace denial; missing/nonowned session is `404`; local selection changes only after success |
| List messages | `GET /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId/messages` | Bearer via interceptor | Explicit/required | None | `ChatMessageResponse[]`; Angular `ChatMessage[]` | `401`; `403` workspace denial; missing/nonowned session is `404`; message loading stops/toasts |
| Get default agent | `GET /workspaces/:workspaceId/agents/default` | Bearer via interceptor | Explicit/required | None | Backend `AgentDetail`; Angular `Agent` | `401`; `403` workspace denial; any active role may cause default-agent creation |
| Stream chat | `GET /workspaces/:workspaceId/agents/:agentId/sessions/:sessionId/stream?message=<encoded>&token=<firebase-token>` via `EventSource` | **No Angular authorization header**; Firebase token is a query parameter | **No Angular header**; workspace is in path | Nonempty `message`, Firebase `token` | Backend emits `ChatStreamEvent` variants described below; Angular declares parsed `any` | HTTP `401` token and `403` workspace denial; after connect, missing agent/nonowned session emits `error`; parse/native errors error the observer; `done`/message `error` complete; unsubscribe closes |

The concrete server-emitted union is:

```ts
type ChatStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'citations'; citations: Array<{ source_document: string; content: string; score: number | null }> }
  | { type: 'done' }
  | { type: 'error'; detail: string };
```

Current Angular policy is separate from validation: it performs only `JSON.parse`, forwards every successfully parsed value (including unknown/malformed discriminants), appends only recognized token/citation events, and leaves an unknown type open. `done` and parsed `error` close/complete; the component ignores `error` in `next`, then reloads messages without toast/fallback. JSON parse failure and native `EventSource.onerror` enter the subscriber error handler. The approved React outcome is strict runtime union validation: a valid `error` keeps the current Angular completion/reload policy; unknown type or malformed known variant is a protocol error that closes the stream and follows the transport/parse error UI (toast plus fallback assistant text).

## Resolved React runtime contracts

These Angular `any`/assertion gaps are resolved from the backend schemas and concrete service returns. The React client must validate the unwrapped `data` before exposing domain values:

| Gap | Angular assertion | Actual wire schema | Required React validation and outcome |
| --- | --- | --- | --- |
| Knowledge upload/manual/retry (`KB-09`) | `KnowledgeDocument` | `DocumentUploadResponse`: UUID-string `id`, string `title`, `DocumentStatus` `status`, and nullable string `temporal_workflow_id` | Require those four fields and the known status enum. Do not accept or synthesize a full document. Refetch/list-normalize after success before inserting or replacing a `KnowledgeDocument`. |
| Ingestion status (`KB-09`) | `any` | `IngestionStatusResponse`: UUID-string `document_id`; `DocumentStatus` `status`; nullable string `error_message`; nullable integer `chunk_count`, `entity_count`, `relation_count`; nullable number `processing_time_seconds` | Require the identifiers/status and validate every nullable metric by its declared primitive. A `404` is an HTTP failure, never a fabricated status object. |
| Topic update (`TOPIC-07`) | `any` | Concrete `TopicService.update_topic` result: string `workspace_id`, `topic_id`, `name`, `slug`, `status` | Require all five string fields. Narrow `status` to the frontend-supported topic-status enum before putting it in domain state; reject an unsupported value as a contract error. |
| Workspace selection (`API-05`) | `any` | `UserItemResponse`: inherited strings `code`, `message`; strings `id`, `firebase_uid`, `email`, `full_name`; boolean `is_active`; array of `email_password | google | facebook` `login_providers`; nullable strings `avatar_url`, `current_workspace_id` | Validate all nested fields in addition to the outer `DataResponse` envelope. Automatic initialization applies the validated user to `AuthStore` after success. Sidebar selection intentionally ignores the returned user and retains its earlier signal/storage update. |
| Streaming events (`CHAT-07`) | parsed `any` | The four `ChatStreamEvent` variants above | Validate the discriminant and every variant field before dispatch. Valid `error` completes/reloads as Angular does; unknown types and malformed known variants close as protocol errors and use the transport/parse toast and fallback path. |

## Referenced response models

- `User`: database/Firebase identifiers, email/name/avatar, active flag, login providers, optional current workspace.
- `Workspace`, `WorkspaceMember`, and `WorkspaceInvitation`: identifiers, roles/statuses, ownership/inviter metadata, and timestamps as defined in `core/models/workspace.model.ts`.
- `DocumentUploadResponse` is deliberately sparse and is not a `KnowledgeDocument`. `KnowledgeDocument`: type/status, source metadata, ingestion counts/errors/timing, uploader, and timestamps. `KnowledgeGraphData` is `{ nodes: GraphNode[]; edges: GraphEdge[] }`.
- `TopicDetailResponse` extends `Topic` with `members: MemberDetail[]`; merge input identifies one target and one-or-more sources.
- `Agent`, `ChatSession`, `ChatMessage`, and `Citation` are defined in `features/agents/models/agent.model.ts`.

## Inventory traceability

Every `http.get/post/put/delete` and `new EventSource` match from the required inventory command maps to one row above. `AuthApiService.syncUser` is also included even though its line-broken `.post` call is not matched by that exact regular expression.
