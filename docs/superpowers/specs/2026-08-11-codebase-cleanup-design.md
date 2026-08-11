# FLAE Codebase Cleanup Design

**Date:** 2026-08-11

**Status:** Approved design

## Purpose

FLAE has not been released, so the codebase does not need to preserve development-only product surfaces, database history, Temporal history, or parallel ingestion implementations. This cleanup establishes one readable production path, removes placeholder capabilities, and reorganizes the repository around explicit domain boundaries.

The cleanup is intentionally staged. Each stage must leave the retained product flows testable and must be independently revertible.

## Confirmed assumptions

- Development data may be deleted and recreated.
- Existing development Alembic history may be squashed into clean baselines.
- Existing development Temporal workflow history and namespace state may be reset.
- The legacy ingestion implementation may be deleted without a compatibility window.
- The current V2 ingestion behavior becomes the first official ingestion contract, V1.
- The public API remains versioned under `/api/v1` so a future incompatible API can be introduced under `/api/v2`.
- The current dirty worktree belongs to the repository owner and must be intentionally checkpointed before cleanup implementation begins.

## Goals

- Remove product features and demo code that do not belong to the first release.
- Leave one ingestion implementation and one runtime route to it.
- Make domain ownership and dependency direction obvious from paths and names.
- Separate transport, orchestration, business logic, persistence, and agent runtime responsibilities.
- Replace historical migration noise with clean database baselines.
- Remove unused modules, settings, dependencies, tests, fixtures, and documentation.
- Preserve tenant isolation, evidence provenance, deterministic ingestion, and retrieval behavior.
- Keep the repository easy to extend without speculative abstractions or speculative V2 implementations.

## Non-goals

- Adding new product capabilities.
- Preserving development-only data or Temporal executions.
- Maintaining the old ingestion implementation as a fallback.
- Creating `/api/v2` or a second ingestion implementation before an incompatible contract actually exists.
- Changing the approved evidence-first Company Memory business behavior merely to make the folder structure simpler.
- Replacing domain tests with broad snapshot tests.

## Current-state findings

### Placeholder product surfaces

`Morning Brief`, `Inbox`, and `Reports` are frontend-only “Coming soon” pages. Their current footprint includes feature directories, lazy routes, sidebar entries, locale keys, unit tests, Playwright flows, and Angular-to-React migration documentation.

The historical `briefing_items` table is created by the initial migration and dropped by a later migration. No current model or runtime service owns it.

The dashboard home is backed by production-source fixtures and preview panels rather than live server state. It should not remain as a misleading first-release surface.

### Parallel ingestion implementations

The backend currently contains a legacy `DocumentIngestionWorkflow` and a newer `IngestionWorkflowV2`, separate activities and workers, V1/V2 routing, feature flags, compatibility auditing, rollout policy, and retirement checks. This is transition infrastructure for a transition that is unnecessary before the first release.

### Naming and ownership drift

Examples include:

- `app/services/knowalge_base/`
- `sche_*` schema modules
- `srv_*` service modules
- SQLAlchemy/RAG models placed under `app/db/`
- business logic embedded in Temporal activities
- extraction code split between agent and knowledge-service concepts
- tracked generated inventory such as `repo_map.txt`

These patterns make dependencies and responsibilities harder to understand.

## First-release product surface

The retained product capabilities are:

- Authentication and invitation acceptance
- Workspace management and settings
- AI Chat
- Agent configuration and agent chat
- Knowledge Library and ingestion
- Knowledge Graph
- Topics

The following capabilities are removed completely:

- Morning Brief
- Inbox
- Reports
- Fixture-backed dashboard preview
- Temporal Greeting demo
- Associated routes, navigation, locale keys, fixtures, tests, schemas, documentation, and runtime registrations

`/dashboard` redirects to `/dashboard/chat`. Chat is the default Company Memory entry point and must not depend on fixture data.

## Versioning policy

### Public API

The public transport remains under `/api/v1`:

```text
backend/app/api/v1/
├── router.py
└── routes/
```

Frontend HTTP, SSE, and WebSocket clients continue to use `/api/v1`. A future `/api/v2` is introduced only for an incompatible public transport contract.

### Ingestion

The legacy V1 implementation is deleted. The behavior currently implemented as V2 becomes the official first ingestion contract.

Normal code names remain canonical and do not carry version suffixes:

```text
app/schemas/ingestion.py
app/services/knowledge/ingestion/
app/temporal/workflows/ingestion.py
app/temporal/activities/ingestion.py
```

```python
class IngestionWorkflow: ...
class IngestionInput: ...
class IngestionService: ...
```

Durable or persisted contract boundaries remain explicitly versioned:

```python
@workflow.defn(name="KnowledgeIngestionWorkflowV1")
class IngestionWorkflow: ...
```

The pipeline metadata records `pipeline_version="v1"`. Other parser, taxonomy, authorization, embedding, or evaluation versions are retained only when they are required to reproduce persisted results. Such values are defined as typed constants in one owning module, not scattered through class and file names.

There is no runtime fallback, dual execution, shadow execution, rollout routing, or retirement gate.

## Target backend architecture

The backend retains the repository-mandated `Endpoint -> Service -> Model` architecture and groups each layer by business domain.

```text
backend/app/
├── api/
│   └── v1/
│       ├── router.py
│       └── routes/
│           ├── auth.py
│           ├── users.py
│           ├── workspaces.py
│           ├── agents.py
│           ├── chat.py
│           ├── knowledge.py
│           └── topics.py
├── schemas/
│   ├── common.py
│   ├── auth.py
│   ├── users.py
│   ├── workspaces.py
│   ├── agents.py
│   ├── chat.py
│   ├── knowledge.py
│   └── ingestion.py
├── services/
│   ├── auth/
│   ├── workspaces/
│   ├── agents/
│   ├── chat/
│   ├── connectors/
│   └── knowledge/
│       ├── ingestion/
│       ├── extraction/
│       ├── graph/
│       ├── retrieval/
│       ├── discovery/
│       └── repositories/
├── models/
├── agents/
├── temporal/
│   ├── workflows/
│   └── activities/
├── connectors/
├── core/
└── db/
```

### Layer responsibilities

- API routes validate transport payloads, apply authentication/authorization dependencies, call services, and format typed responses. They do not execute or commit database queries.
- Services own business rules and database transactions. Domain-specific repositories live under the owning service domain and expose typed persistence operations.
- Models contain physical SQLAlchemy table definitions.
- `db/` contains engines, sessions, checkpointer setup, and database-specific infrastructure. It does not own business entities.
- Temporal workflows coordinate durable steps using references and checksums.
- Temporal activities adapt Temporal calls to services. They do not duplicate domain algorithms.
- `agents/` contains LangChain/LangGraph runtime, prompts, state, and read-only tools. Knowledge extraction that is part of ingestion belongs to the knowledge service.
- `core/` contains cross-cutting configuration, security, logging, exceptions, observability, and telemetry redaction.

Dependencies flow inward:

```text
API / Temporal / Agents
          |
          v
       Services
          |
          v
Models / repositories / external adapters
```

Circular imports and reverse dependencies across these boundaries are defects.

### Naming and file rules

- Use complete domain names: `knowledge`, not `knowalge_base`.
- Use descriptive module names: `users.py`, not `sche_user.py`; `service.py` or a specific capability name, not `srv_user.py`.
- Use `snake_case` for Python files and symbols according to framework conventions.
- Prefer one cohesive responsibility per file.
- Keep source files within the existing 450-line quality limit; target 300 lines when a natural split exists.
- Do not introduce a base class, protocol, factory, or adapter until at least one real boundary requires it.

## Target frontend architecture

```text
frontend/src/
├── app/
├── core/
├── features/
│   ├── auth/
│   ├── chat/
│   ├── agents/
│   ├── knowledge/
│   ├── topics/
│   └── settings/
└── shared/
```

- Remove the `briefing`, `inbox`, `reports`, and fixture-backed `dashboard` feature directories.
- Consolidate reusable message rendering, streaming state, composer behavior, citations, and conversation UI under `features/chat`.
- Agent pages may compose Chat capability through typed props and hooks; they must not duplicate the streaming implementation.
- Keep all server state in TanStack Query.
- Keep typed network calls inside the owning feature’s `api/` directory.
- Keep `shared/ui` presentational and free of API calls, Zustand access, and feature-specific rules.
- Keep `core/` limited to application infrastructure such as auth, configuration, network transport, stores, and realtime primitives.
- Do not ship fixtures, preview-only actions, or mock product data from `frontend/src`.

## Canonical data flow

```text
API or Connector
      |
      v
Source Sync Service
      |
      v
KnowledgeIngestionWorkflowV1
      |
      v
Atomic base publish ----------------------> Authorized base retrieval
      |
      v
Evidence extraction and graph enrichment -> Authorized TGS retrieval
      |
      v
Topic/context discovery -----------------> Navigation and memory state
                                                |
                                                v
                                         Chat and Agents
```

There is one route into ingestion. Base publication remains isolated from downstream enrichment so searchable chunks remain available when graph or discovery enrichment fails.

Workflows pass typed IDs, references, checksums, limits, and pipeline metadata. Raw documents, full chunk arrays, and embeddings stay in object storage or the RAG database rather than Temporal history.

## Database and migration design

- Reset all development databases before validating the new baselines.
- Create a clean baseline track for `flae_db`.
- Create a separate clean baseline track for `rag_db`.
- Keep `flae_agent_state_db` scoped to LangGraph checkpoint and agent state concerns.
- Baselines contain only the final tables, indexes, enums, constraints, extensions, grants, and RLS policies.
- The new baseline never creates historical product tables such as `briefing_items` merely to drop them later.
- Runtime application startup does not create or alter product schema.
- Clean-install tests upgrade empty disposable databases to head and verify tenant isolation.
- The reset procedure is documented and fails clearly when pointed at a non-development environment.

## Temporal topology

Two workers remain because their operational responsibilities differ:

- `application-worker`: invitation and lightweight application workflows.
- `knowledge-worker`: ingestion, evidence extraction, graph enrichment, discovery, and memory-state projection.

Task queue names, retry policies, timeouts, heartbeat policies, and concurrency limits are typed settings. They are not named after V2.

The Greeting workflow, legacy Document ingestion workflow, legacy activities, feature-flag routing, compatibility auditing, rollout policy, and retirement tooling are deleted after all consumers use the canonical workflow.

## Error and transaction behavior

- Services translate infrastructure failures into custom application exceptions.
- API global handlers return standardized responses and never expose stack traces.
- Temporal distinguishes retryable infrastructure failures from non-retryable invalid commands.
- Ingestion writes are idempotent under activity retry and workflow replay.
- Partial staging never becomes current through an incomplete publish.
- Graph or discovery failure does not revoke an already searchable base revision.
- Tenant and source ACL filtering occurs before candidate generation and traversal.
- Logs and traces use the existing redaction boundary and never emit raw document content, credentials, or cross-tenant identifiers.

## Cleanup sequence

### Stage 0: Establish a safe baseline

- Intentionally checkpoint the existing dirty worktree before cleanup starts.
- Repair or rebuild the GitNexus index.
- Record the current backend and frontend test results, including pre-existing failures.
- Freeze an allowlist of retained product capabilities and critical execution flows.
- Run GitNexus upstream impact analysis before editing or deleting every symbol.
- Stop and warn before proceeding with any HIGH or CRITICAL blast radius.

### Stage 1: Remove non-product surfaces

- Remove Morning Brief, Inbox, Reports, fixture-backed Dashboard, and Greeting demo.
- Remove all corresponding route, navigation, locale, fixture, test, documentation, worker, and schema references.
- Redirect `/dashboard` to `/dashboard/chat`.

### Stage 2: Establish the canonical ingestion contract

- Add characterization tests for the retained current V2 behavior.
- Move all callers and worker registrations to canonical V1 names.
- Verify replay, retry idempotency, atomic publish, failure isolation, and evidence parity.
- Delete the legacy workflow and activities.
- Delete V1/V2 routing flags, compatibility audits, rollout policy, retirement service, scripts, and tests whose only purpose was the transition.

### Stage 3: Reorganize the API and domain modules

- Keep `/api/v1` and reorganize handlers under `app/api/v1/routes/`.
- Update imports one domain at a time.
- Rename and split schemas, services, knowledge modules, models, and repositories according to the target ownership rules.
- Move business logic out of Temporal activities before deleting the old modules.
- Use graph-aware rename operations rather than repository-wide text replacement.

### Stage 4: Consolidate frontend capabilities

- Remove deleted feature bundles and tests.
- Consolidate Chat and Agent Chat primitives without moving server state into Zustand.
- Update router, navigation, locale catalogs, E2E fixtures, and default-route expectations.
- Confirm every visible action is connected or intentionally removed.

### Stage 5: Create clean database baselines

- Generate baselines from the final reviewed models.
- Review SQL, extensions, constraints, RLS, indexes, grants, and downgrade/reset behavior manually.
- Reset disposable development databases and Temporal state.
- Run clean-install and tenant-isolation smoke tests.

### Stage 6: Remove residual waste

- Remove `repo_map.txt` and obsolete Angular migration documentation.
- Remove orphan modules, routes, settings, environment variables, fixtures, scripts, tests, and dependencies.
- Confirm cache, coverage, build, Playwright, and Python bytecode outputs remain ignored.
- Update README and operational documentation to describe only the resulting system.

### Stage 7: Final verification

- Run the complete backend suite, coverage, type checks, migration tests, and structural import checks.
- Run frontend unit tests, coverage, typecheck, lint, production build, and critical Playwright flows.
- Run a Docker smoke flow covering authentication, workspace selection, ingestion, retrieval, and chat.
- Run GitNexus `detect_changes` and review every affected execution process before each commit and at final scope.

## Deletion criteria

A candidate may be deleted only when all of the following are true:

- It is outside the approved first-release product surface, or its consumers have moved to the canonical replacement.
- Static search and GitNexus show no retained runtime consumer.
- Its API route, worker registration, scheduled execution, configuration, and persistence ownership have been checked.
- Retained behavior has characterization or replacement coverage before deletion.
- Documentation and operational commands no longer reference it.
- The deletion does not remove required evidence-first, authorization, or tenant-isolation behavior.

Git history is the recovery mechanism for deleted pre-release code. The source tree does not keep commented code, `legacy/` folders, compatibility shims, or unused feature flags as an archive.

## Verification gates

### Backend

```bash
uv run --project backend pytest
uv run --project backend pytest --cov=app --cov-report=term-missing
uv run --project backend pyrefly check
```

The implementation plan must add exact commands for the two database baseline tracks and their disposable PostgreSQL smoke tests.

### Frontend

```bash
npm --prefix frontend run test
npm --prefix frontend run test:coverage
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

### Structural and runtime gates

- No unexpected import cycles.
- No tracked build, coverage, cache, or bytecode artifacts.
- No placeholder product route or production fixture data.
- Exactly one ingestion workflow is registered for new executions.
- `/api/v1` HTTP, SSE, and WebSocket clients remain consistent.
- Empty development databases can be bootstrapped from documented commands.
- Authentication, workspace isolation, ingestion, authorized retrieval, and chat pass end to end.
- Retained backend and frontend code maintains at least 75% coverage.

## Completion criteria

- Morning Brief, Inbox, Reports, fixture-backed Dashboard, and Greeting demo are absent from source and product navigation.
- The legacy ingestion implementation and all transition infrastructure are absent.
- The retained ingestion behavior is represented as official V1 at durable contract boundaries and uses canonical unversioned code names internally.
- Public endpoints remain under `/api/v1`.
- Backend modules follow explicit domain ownership and dependency direction.
- Frontend contains only retained feature domains and has one shared Chat capability.
- Database baselines describe only the final pre-release schema.
- No orphan route, module, setting, environment variable, dependency, test, fixture, or documentation reference remains.
- All verification gates pass from a clean checkout and clean development databases.

## Implementation discipline

- Implement one stage and usually one domain per commit.
- Add or update tests before deleting retained behavior.
- Do not mix product deletion, ingestion cutover, schema squash, and broad naming moves in one commit.
- Run focused tests after every small change and the complete relevant suite at each stage boundary.
- Run GitNexus impact analysis before symbol edits and `detect_changes` before commits.
- Preserve unrelated user changes in the worktree.
