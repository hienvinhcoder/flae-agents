# Angular to React Frontend Migration Design

**Status:** Approved

**Date:** 2026-07-22

## 1. Objective

Replace the current Angular 20 frontend with a React single-page application while retaining the existing FastAPI backend, Firebase Authentication integration, public route paths, backend API contracts, internationalization, and realtime behaviors.

The project has not been released, so the migration does not need to support live traffic or simultaneous feature delivery in Angular. The new user interface may be redesigned. Only the existing primary brand palette is required to remain stable.

## 2. Current State

The current frontend is an Angular 20 application under `frontend/` with approximately 11,700 lines of TypeScript, HTML, and CSS. It uses:

- Angular Router and lazy-loaded feature routes.
- Angular Signals and RxJS for state and asynchronous behavior.
- AngularFire and Firebase Authentication.
- Angular `HttpClient` interceptors for authentication and errors.
- Tailwind CSS 4 and design tokens from `DESIGN.md`.
- `@ngx-translate` with English and Vietnamese JSON resources.
- EventSource-based chat streaming and a WebSocket service skeleton.
- Karma and Jasmine tests.

The feature set includes auth, invite acceptance, briefing, inbox, chat, agents, knowledge management, knowledge graph, topics, reports, settings, and workspace management. The most complex migration target is `knowledge-graph.component.ts`, which currently exceeds 800 lines and already violates the 450-line source-file rule.

The current development rules are in `.agents/rules/flae-code.md`. Its frontend guidance explicitly requires Angular, Angular Router, Angular Signals, Angular inputs and outputs, RxJS subscription handling, and Angular feature route files. These rules must be replaced as part of the migration.

## 3. Constraints and Decisions

- The target remains a client-rendered SPA. Server-side rendering and SEO support are out of scope.
- The target runtime is React with Vite and strict TypeScript.
- The backend remains FastAPI. Existing API paths and response contracts remain stable unless a separately reviewed backend change is required for secure realtime transport.
- Firebase Authentication remains the sole identity provider.
- Existing application URLs remain stable so bookmarks, redirects, and backend-generated links continue to work.
- The React application is built in parallel under `frontend-react/` while Angular remains under `frontend/` as a behavior reference.
- Angular and React do not run inside one browser application and do not share runtime code.
- At cutover, the React application replaces `frontend/`. Angular is removed from the repository and remains recoverable through Git history.
- The UI may be redesigned. The required brand tokens are `#F28C45`, `#E77E37`, `#D96F26`, and `rgba(242, 140, 69, 0.10)` for primary, hover, active, and soft states.

## 4. Considered Migration Strategies

### 4.1 Parallel React Application and Final Cutover

Build a complete React frontend next to Angular, migrate by feature, verify each feature against the same backend, then replace Angular after all exit criteria pass.

This is the selected approach. It allows direct behavioral comparison for authentication, workspace selection, chat streaming, and graph interactions without introducing production microfrontend infrastructure.

### 4.2 In-place Replacement

Replace Angular files directly under `frontend/`. This reduces temporary structure but leaves the frontend incomplete through most of the migration and makes behavior comparison harder.

### 4.3 Route-by-route Angular and React Coexistence

Serve Angular and React within a microfrontend or router bridge. This would allow incremental production rollout but introduces duplicate routing, state, build, and authentication integration. It is unnecessary because the project has not been released.

## 5. Target Architecture

During migration, the repository has these application boundaries:

```text
frontend/          Angular reference implementation
frontend-react/    React replacement application
backend/           Existing FastAPI application
```

The React frontend uses:

- React and Vite for the SPA runtime and build.
- TypeScript in strict mode.
- React Router for route composition and feature-level lazy loading.
- TanStack Query for remote data, caching, mutations, invalidation, and request lifecycle state.
- Zustand for minimal shared client state: authenticated database user, selected workspace, and genuinely global UI state.
- Firebase Web SDK for authentication.
- React Hook Form and Zod for form state and validation.
- Tailwind CSS for styling and design tokens.
- `react-i18next` for English and Vietnamese translations.
- `lucide-react` for icons.
- Vitest, React Testing Library, and Playwright for automated verification.

Package versions are selected and locked when the foundation task is executed. The migration plan must use mutually compatible stable releases and commit the generated lockfile.

### 5.1 Source Layout

```text
frontend-react/src/
├── app/
│   ├── providers/
│   ├── router/
│   └── main.tsx
├── core/
│   ├── api/
│   ├── auth/
│   ├── config/
│   ├── realtime/
│   └── stores/
├── shared/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── ui/
└── features/
    ├── agents/
    ├── auth/
    ├── briefing/
    ├── chat/
    ├── inbox/
    ├── invite/
    ├── knowledge/
    ├── reports/
    ├── settings/
    └── topics/
```

Each feature may contain `routes`, `pages`, `ui`, `api`, `hooks`, `schemas`, and `types`. Route pages orchestrate feature hooks and UI. Presentational components receive typed props and callbacks and do not call APIs or read global stores directly.

## 6. Routing

React Router preserves these public route families:

- `/auth/login`
- `/auth/register`
- `/invite/*`
- `/dashboard/briefing`
- `/dashboard/inbox`
- `/dashboard/chat`
- `/dashboard/agents/*`
- `/dashboard/knowledge/*`
- `/dashboard/topics/*`
- `/dashboard/reports`
- `/dashboard/settings/*`

The root path continues to redirect to `/auth/login`. Authenticated dashboard routes render within one application shell. Each major feature is lazy-loaded and has its own error boundary and loading fallback. Auth guards wait for Firebase restoration and backend user synchronization before deciding whether to redirect.

## 7. Authentication and Workspace Lifecycle

Authentication follows this sequence:

1. Initialize Firebase and wait for `authStateReady()`.
2. If Firebase has a user, obtain an ID token.
3. Call `POST /api/v1/auth/sync-user` with the current profile.
4. Store the synchronized database user in the auth store.
5. Load the user's workspaces and restore a valid `currentWorkspaceId`.
6. Render protected routes only after authentication initialization finishes.

Tokens are obtained from Firebase when required and are not persisted in application storage. The shared HTTP client attaches an authorization header to protected requests. On a `401`, the client may obtain a fresh token and retry once. A second `401` resets auth state, workspace state, and the query cache before redirecting to login.

Logout and cross-tab session invalidation perform the same cleanup. No token, email address, or PII-bearing request body may be written to logs.

## 8. API and State Management

Data flows through explicit feature boundaries:

```text
route page
  -> feature query or mutation hook
  -> typed API function
  -> shared HTTP client
  -> FastAPI
```

TanStack Query owns server-derived data such as agents, chat sessions, documents, topics, workspace members, and invitations. Query data is not copied into Zustand. Mutations invalidate or update well-defined query keys.

Zustand owns only client state that must survive component boundaries, including the synchronized user, selected workspace identifier, and application-wide UI state. Component-local state uses `useState` or `useReducer`.

The shared API layer defines `ApiResponse<T>`, `AppError`, authentication handling, error normalization, timeouts, and request cancellation. Existing `any` types in graph and ingestion-status responses are replaced with explicit types during their feature migration.

## 9. Realtime Design

Chat streaming is exposed through feature hooks with an explicit state machine:

```text
idle -> connecting -> streaming -> completed
                         |             |
                         +-> failed <--+
```

Each stream supports cancellation and cleans up its network resource when the route changes, the component unmounts, or a new request supersedes it. Timers, event listeners, SSE connections, WebSockets, and subscriptions require deterministic cleanup.

The current agent chat uses `EventSource` with authentication information in query parameters. During migration, the team must verify whether the backend can support a header-capable streaming client. Moving credentials out of URLs is preferred. If the backend contract must change, that change is scoped as an explicit prerequisite task with backend and frontend tests.

A WebSocket connection manager, when needed by a migrated feature, owns one connection per required scope and implements bounded exponential reconnect, terminal authentication failure handling, and cleanup.

## 10. UI and Design System

The UI is redesigned before migrating feature-specific screens. Only the primary brand palette is immutable. Other neutral colors, typography, spacing, radii, navigation, layout, and interactions may change.

The React design system defines:

- Button, input, textarea, select, checkbox, and form-field primitives.
- Badge, card, table, tabs, dropdown, dialog, tooltip, and toast primitives.
- Skeleton, spinner, empty state, error state, and retry affordances.
- Responsive application shell, navigation, topbar, and workspace selector.

Components use semantic HTML, keyboard navigation, visible focus treatment, correct dialog focus management, reduced-motion preferences, and WCAG AA contrast. Brand colors are referenced through tokens, not hardcoded in feature components.

`DESIGN.md` is updated before UI implementation so the document remains the design source of truth for the new React application.

## 11. Feature Migration Order

Migration occurs in working, testable milestones:

1. React foundation, build, strict TypeScript, linting, tests, environment configuration, providers, and router.
2. React design system and responsive application shell.
3. Firebase auth, backend user sync, route guards, workspaces, and invite acceptance.
4. Briefing, inbox, reports, and settings.
5. Knowledge document list, detail, upload, manual input, status, retry, and delete.
6. Topic list, detail, merge, archive, and document relationships.
7. Agent list, creation, editing, configuration, and agent chat.
8. Default chat, sessions, message history, streaming, retry, cancellation, and citations.
9. Knowledge graph data adapter, graph canvas, toolbar, filters, selection panel, and navigation.
10. Full regression verification, repository cutover, Angular removal, and documentation cleanup.

The knowledge graph is migrated last because it has the largest component and the most DOM, rendering, selection, and event lifecycle behavior. The React design splits it into independently testable units rather than porting the existing monolith.

## 12. Error Handling

- API failures are normalized into `AppError` with a safe user message, error category, optional status, and retryability.
- Authentication failures follow the one-retry rule and then perform centralized logout.
- Backend connectivity failures show an application-level connection dialog with an explicit retry action.
- Expected feature failures appear inline or through a toast and do not crash the application shell.
- The root and major lazy routes have React error boundaries.
- Production UI never exposes stack traces or internal backend messages.

## 13. Testing Strategy

Before migration, create a route and feature parity matrix from the Angular application. Each React milestone must pass:

- Strict TypeScript checking.
- Linting.
- Unit and integration tests.
- Production build.

Automated coverage includes:

- Unit tests for stores, schemas, reducers, adapters, and pure utilities.
- Integration tests for query hooks, mutations, auth initialization, route protection, workspace restoration, and API failure handling.
- Contract tests for API response parsing and graph/status models.
- Component tests using user-visible roles, labels, and behavior.
- Playwright end-to-end tests for email login, Google login, logout, session restoration, workspace selection, invite acceptance, knowledge operations, topic merge/archive, agent create/edit, chat streaming/cancel/retry/citations, and graph filter/selection/navigation.
- Accessibility smoke tests for major routes and shared dialogs.

Frontend statement and branch coverage must remain at or above 75 percent. The CI workflow runs typecheck, lint, unit/integration tests, coverage, production build, and the agreed E2E smoke suite.

## 14. Changes to `flae-code`

The frontend stack and Angular-specific section of `.agents/rules/flae-code.md` are replaced with React guidance.

Permanent React rules require:

- React SPA, Vite, strict TypeScript, React Router, TanStack Query, Zustand, Tailwind, and Firebase.
- Feature-owned `routes`, `pages`, `ui`, `api`, `hooks`, `schemas`, and `types` boundaries.
- Functional components and hooks with typed props.
- Presentational shared UI that does not call APIs or read global stores.
- React Router lazy loading per major feature and stable application paths.
- TanStack Query for server state, Zustand for shared client state, and local React state for component state.
- No duplication of query data into Zustand.
- React Hook Form and Zod for non-trivial forms and shared validation.
- Typed feature API functions through the shared HTTP client; no direct network calls from components.
- Effect cleanup for timers, listeners, streams, sockets, and subscriptions.
- A 450-line source-file maximum and no `any` without a documented boundary reason.
- Vitest, React Testing Library, Playwright, and at least 75 percent coverage.
- Semantic HTML, keyboard access, focus management, reduced motion, and WCAG AA contrast.
- Primary palette tokens from `DESIGN.md` and no brand-color literals in feature components.

Temporary migration rules state:

- `frontend/` is the Angular reference implementation and receives no new feature work unless needed to unblock migration verification.
- `frontend-react/` is the React implementation.
- The two frontends cannot import each other's runtime code.
- A React feature is marked migrated only after its acceptance tests and parity checks pass.
- Temporary migration rules are removed when React replaces `frontend/`.

## 15. Cutover

Cutover begins only when:

- Every route and feature in the parity matrix passes.
- Typecheck, lint, unit tests, integration tests, E2E tests, coverage, and production build pass.
- Firebase auth, backend APIs, i18n, and realtime flows pass against a production build.
- Frontend coverage is at least 75 percent.
- Scripts, Docker, CI, and documentation have React-ready changes prepared.

The cutover commit replaces the Angular `frontend/` tree with the reviewed React application, updates `start.sh`, `run_frontend_tests.sh`, `frontend/Dockerfile`, `.github/workflows/test.yml`, `frontend/README.md`, `DESIGN.md`, and `.agents/rules/flae-code.md`, and removes Angular dependencies, configuration, tests, and generated artifacts.

Before the replacement, create a named Git tag or clearly identified commit so rollback is deterministic. Rollback restores the Angular frontend and its scripts from that point; it does not require a database rollback because the migration does not alter persisted application data by default.

## 16. Acceptance Criteria

- The repository contains one supported frontend under `frontend/`, implemented with React and Vite.
- No Angular imports, packages, build configuration, runtime artifact, or Angular-specific rule remains.
- Existing public application URLs and required backend contracts remain stable.
- Firebase email and Google authentication, user synchronization, logout, and session restoration work.
- Workspace selection and invitation flows work.
- All current feature families are available in React.
- Streaming and connection cleanup are deterministic and covered by tests.
- The redesigned UI uses the retained primary palette and meets accessibility requirements.
- The React frontend passes CI, production build, E2E smoke tests, and at least 75 percent coverage.
- `.agents/rules/flae-code.md`, `DESIGN.md`, scripts, Docker, CI, and README describe the React implementation rather than Angular.

## 17. Out of Scope

- SSR or SEO infrastructure.
- A production microfrontend architecture.
- Backend domain redesign or database migration.
- Rewriting stable backend endpoints solely to make them stylistically different.
- Preserving pixel parity with the Angular interface.
- Adding new product features unrelated to achieving parity with the current Angular application.
