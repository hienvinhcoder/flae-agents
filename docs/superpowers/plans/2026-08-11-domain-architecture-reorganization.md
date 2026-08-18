# Domain Architecture Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize backend and frontend ownership so paths, names, and dependency direction communicate the system architecture without changing public `/api/v1` behavior.

**Architecture:** Backend keeps `Endpoint -> Service -> Model`, grouped by domain; Temporal activities become thin service adapters; RAG records leave `db/`; frontend Chat owns conversation transport, schemas, hooks, types, and UI. Moves occur one domain per commit and use Git history plus graph-aware symbol renames.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, Temporal, React, TanStack Query, Zustand, TypeScript, pytest, Vitest, GitNexus.

---

## High-risk warning

This is a HIGH-risk import and ownership refactor. No task may mix behavioral changes with path moves. Run the focused suite after each domain and the complete backend/frontend type checks at every checkpoint.

## Final backend map

```text
backend/app/
├── api/v1/
│   ├── router.py
│   └── routes/
├── schemas/
│   ├── common.py
│   ├── users.py
│   ├── workspaces.py
│   ├── agents.py
│   ├── chat.py
│   ├── knowledge.py
│   └── topics.py
├── services/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── agents/
│   ├── chat/
│   ├── connectors/
│   ├── storage/
│   └── knowledge/
│       ├── ingestion/
│       ├── extraction/
│       ├── graph/
│       ├── retrieval/
│       ├── discovery/
│       ├── memory_state/
│       └── repositories/
├── models/
│   └── rag/
├── agents/
├── temporal/
├── connectors/
├── core/
└── db/
```

## Module move manifest

### API

```text
app/api/v1/api_router.py              -> app/api/v1/router.py
app/api/v1/endpoints/agent.py         -> app/api/v1/routes/agents.py
app/api/v1/endpoints/auth.py          -> app/api/v1/routes/auth.py
app/api/v1/endpoints/chat_stream.py   -> app/api/v1/routes/chat.py
app/api/v1/endpoints/knowledge_base.py-> app/api/v1/routes/knowledge.py
app/api/v1/endpoints/topic.py         -> app/api/v1/routes/topics.py
app/api/v1/endpoints/user.py          -> app/api/v1/routes/users.py
app/api/v1/endpoints/workspace.py     -> app/api/v1/routes/workspaces.py
```

### Schemas

```text
app/schemas/sche_base.py           -> app/schemas/common.py
app/schemas/sche_user.py           -> app/schemas/users.py
app/schemas/sche_workspace.py      -> app/schemas/workspaces.py
app/schemas/sche_agent.py          -> app/schemas/agents.py + app/schemas/chat.py
app/schemas/sche_knowledge_base.py -> app/schemas/knowledge.py
app/schemas/sche_topic.py          -> app/schemas/topics.py
```

### Application services

```text
app/services/auth_service.py         -> app/services/auth/service.py
app/services/srv_user.py             -> app/services/users/service.py
app/services/workspace_srv.py        -> app/services/workspaces/service.py
app/services/workspace_member_srv.py -> app/services/workspaces/members.py
app/services/agent_srv.py            -> app/services/agents/service.py
app/services/chat_srv.py             -> app/services/chat/service.py
app/services/gcs_storage_srv.py      -> app/services/storage/gcs.py
```

### Knowledge and connectors

```text
app/services/knowalge_base/                    -> app/services/knowledge/
app/services/knowledge_base_srv.py             -> app/services/knowledge/documents.py
app/services/knowledge_graph_srv.py            -> app/services/knowledge/graph/api_service.py
app/services/srv_topic.py                      -> app/services/knowledge/discovery/topics.py
app/services/connector_ingestion_gateway.py    -> app/services/connectors/ingestion_gateway.py
app/services/connector_state_repository.py     -> app/services/connectors/state_repository.py
app/services/source_sync_service.py            -> app/services/connectors/source_sync.py
app/services/knowledge_catalog_repository.py   -> app/services/knowledge/discovery/catalog_repository.py
app/services/knowledge_catalog_service.py      -> app/services/knowledge/discovery/catalog_service.py
app/services/context_discovery_service.py      -> app/services/knowledge/discovery/context_service.py
app/services/discovery_projection_service.py   -> app/services/knowledge/discovery/projection_service.py
app/services/discovery_snapshot_repository.py  -> app/services/knowledge/discovery/snapshot_repository.py
app/services/discovery_snapshot_service.py     -> app/services/knowledge/discovery/snapshot_service.py
app/services/topic_discovery_helpers.py        -> app/services/knowledge/discovery/topic_helpers.py
app/services/topic_discovery_repository.py     -> app/services/knowledge/discovery/topic_repository.py
app/services/topic_discovery_service.py        -> app/services/knowledge/discovery/topic_service.py
app/services/topic_resolver.py                 -> app/services/knowledge/discovery/topic_resolver.py
app/services/memory_state_repository.py        -> app/services/knowledge/memory_state/repository.py
app/services/memory_state_service.py           -> app/services/knowledge/memory_state/service.py
app/services/snapshot_observability.py         -> app/services/knowledge/observability.py
```

### RAG records and repository

```text
app/db/rag_models.py              -> app/models/rag/records.py
app/db/rag_graph_models.py        -> app/models/rag/graph.py
app/db/rag_staging_models.py      -> app/models/rag/staging.py
app/db/rag_memory_state_models.py -> app/models/rag/memory_state.py
app/models/topic.py               -> app/models/rag/topics.py
app/db/rag_repository.py          -> app/services/knowledge/repositories/tenant.py
```

### Task 1: Strengthen architecture tests before moving files

**Files:**

- Modify: `backend/tests/architecture/test_backend_rules.py`
- Create: `frontend/src/app/architecture-boundaries.test.ts`

- [ ] **Step 1: Add backend forbidden-name and thin-activity tests**

Append:

```python
def test_backend_has_no_legacy_module_names() -> None:
    forbidden = ("knowalge_base", "sche_", "srv_")
    violations = [
        str(path.relative_to(BACKEND_ROOT))
        for path in APP_ROOT.rglob("*.py")
        if any(token in str(path.relative_to(APP_ROOT)) for token in forbidden)
    ]
    assert violations == []


def test_temporal_activities_do_not_execute_database_transactions() -> None:
    violations: list[str] = []
    for path in (APP_ROOT / "temporal" / "activities").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        if re.search(r"\b(?:db|session)\.(?:execute|commit|delete|add)\s*\(", source):
            violations.append(str(path.relative_to(BACKEND_ROOT)))
    assert violations == []


def test_rag_records_live_under_models() -> None:
    forbidden = [
        APP_ROOT / "db" / "rag_models.py",
        APP_ROOT / "db" / "rag_graph_models.py",
        APP_ROOT / "db" / "rag_staging_models.py",
        APP_ROOT / "db" / "rag_memory_state_models.py",
    ]
    assert [str(path) for path in forbidden if path.exists()] == []
```

- [ ] **Step 2: Add frontend source-boundary assertions**

Create `architecture-boundaries.test.ts`:

```ts
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  }));
  return files.flat();
}

describe("feature boundaries", () => {
  it("keeps chat session and message ownership out of agents", async () => {
    const root = path.resolve("src/features/agents");
    const violations: string[] = [];
    for (const file of await sourceFiles(root)) {
      const source = await readFile(file, "utf8");
      if (/ChatSession|ChatMessage|CitationList|useSessions/.test(source)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Run architecture tests and verify they fail**

```bash
uv run --project backend pytest backend/tests/architecture/test_backend_rules.py -q
npm --prefix frontend run test -- architecture-boundaries.test.ts
```

Expected: FAIL with the current legacy paths, direct activity transactions, and Chat ownership violations.

### Task 2: Reorganize `/api/v1` routes without changing transport paths

**Files:** API move manifest, `backend/main.py`, API tests.

- [ ] **Step 1: Impact-check router and every route handler symbol**

Run GitNexus `api_impact` for each handler file and `impact` for the top-level `router` in `api_router.py`. Record HTTP method, path, middleware/dependencies, frontend consumers, and response keys. Stop on mismatches before moving.

- [ ] **Step 2: Move API modules**

```bash
mkdir -p backend/app/api/v1/routes
git mv backend/app/api/v1/api_router.py backend/app/api/v1/router.py
git mv backend/app/api/v1/endpoints/agent.py backend/app/api/v1/routes/agents.py
git mv backend/app/api/v1/endpoints/auth.py backend/app/api/v1/routes/auth.py
git mv backend/app/api/v1/endpoints/chat_stream.py backend/app/api/v1/routes/chat.py
git mv backend/app/api/v1/endpoints/knowledge_base.py backend/app/api/v1/routes/knowledge.py
git mv backend/app/api/v1/endpoints/topic.py backend/app/api/v1/routes/topics.py
git mv backend/app/api/v1/endpoints/user.py backend/app/api/v1/routes/users.py
git mv backend/app/api/v1/endpoints/workspace.py backend/app/api/v1/routes/workspaces.py
```

Create `backend/app/api/v1/routes/__init__.py` with no eager imports:

```python
"""Version 1 HTTP and realtime route modules."""
```

- [ ] **Step 3: Update router imports explicitly**

`backend/app/api/v1/router.py` must import plural route modules from `app.api.v1.routes` and include each existing router with its current prefix and tags. Do not change endpoint URLs, methods, dependencies, or response models.

Update `backend/main.py`:

```python
from app.api.v1.router import router as api_router_v1
```

- [ ] **Step 4: Update test patch paths**

Examples:

```text
app.api.v1.endpoints.agent.AgentService -> app.api.v1.routes.agents.AgentService
app.api.v1.endpoints.auth.auth_service  -> app.api.v1.routes.auth.auth_service
```

Apply only exact module-path edits shown by `git grep -n 'app.api.v1.endpoints' backend`.

- [ ] **Step 5: Verify route contracts**

```bash
uv run --project backend pytest backend/tests/api -q
uv run --project backend pytest backend/tests/architecture/test_backend_rules.py::test_endpoints_do_not_execute_database_queries -q
```

Expected: PASS.

Run GitNexus `route_map` and compare route method/path pairs with the pre-move capture. Expected: identical pairs under `/api/v1`.

- [ ] **Step 6: Commit API organization**

```bash
git add backend/app/api backend/main.py backend/tests/api
git commit -m "refactor: organize api v1 routes by domain"
```

Run `detect_changes({scope: "staged"})` before the commit; no new or removed HTTP execution flow is allowed.

### Task 3: Normalize transport schemas and split Chat from Agent schemas

**Files:** Schema move manifest and schema/API tests.

- [ ] **Step 1: Move single-domain schemas**

```bash
git mv backend/app/schemas/sche_base.py backend/app/schemas/common.py
git mv backend/app/schemas/sche_user.py backend/app/schemas/users.py
git mv backend/app/schemas/sche_workspace.py backend/app/schemas/workspaces.py
git mv backend/app/schemas/sche_knowledge_base.py backend/app/schemas/knowledge.py
git mv backend/app/schemas/sche_topic.py backend/app/schemas/topics.py
git mv backend/app/schemas/sche_agent.py backend/app/schemas/agents.py
```

- [ ] **Step 2: Extract Chat schemas into `backend/app/schemas/chat.py`**

Move these classes unchanged from `agents.py` into `chat.py`:

```text
ChatSessionCreate
ChatSessionResponse
ChatMessageCreate
CitationDetail
ChatMessageResponse
```

`chat.py` imports `uuid`, `datetime`, `List`, `Optional`, `BaseModel`, and `Field`. `agents.py` retains only Agent configuration/detail schemas.

- [ ] **Step 3: Update schema imports by owner**

For every existing import, preserve the imported symbol list and change only its owning module according to the schema move manifest. `DataResponse` and `ResponseSchemaBase` come from `app.schemas.common`; Agent configuration/detail types come from `app.schemas.agents`; session/message/citation types come from `app.schemas.chat`. Do not introduce compatibility re-export modules.

- [ ] **Step 4: Run schema, API, and service tests**

```bash
uv run --project backend pytest backend/tests/schemas backend/tests/api backend/tests/services/test_agent_srv.py -q
```

Expected: PASS.

- [ ] **Step 5: Verify legacy schema names are absent and commit**

```bash
git grep -n 'app.schemas.sche_' -- backend
```

Expected: no matches.

Run `detect_changes({scope: "staged"})`, then:

```bash
git add backend/app/schemas backend/app/api backend/app/services backend/tests
git commit -m "refactor: organize transport schemas by domain"
```

### Task 4: Group application services by domain

**Files:** Application-service move manifest and all importers/tests.

- [ ] **Step 1: Impact-check service classes before moving**

Run upstream `impact` for `AuthService`, user service classes, `WorkspaceService`, `WorkspaceMemberService`, `AgentService`, and `ChatService`. Include tests and record direct API/Temporal consumers.

- [ ] **Step 2: Create domain packages and move services**

```bash
mkdir -p backend/app/services/auth backend/app/services/users backend/app/services/workspaces backend/app/services/agents backend/app/services/chat backend/app/services/storage
git mv backend/app/services/auth_service.py backend/app/services/auth/service.py
git mv backend/app/services/srv_user.py backend/app/services/users/service.py
git mv backend/app/services/workspace_srv.py backend/app/services/workspaces/service.py
git mv backend/app/services/workspace_member_srv.py backend/app/services/workspaces/members.py
git mv backend/app/services/agent_srv.py backend/app/services/agents/service.py
git mv backend/app/services/chat_srv.py backend/app/services/chat/service.py
git mv backend/app/services/gcs_storage_srv.py backend/app/services/storage/gcs.py
git mv backend/tests/services/test_agent_srv.py backend/tests/services/test_agents_service.py
```

Use `apply_patch` to create each new `__init__.py`. Each file contains one domain docstring such as:

```python
"""Agent application services."""
```

Create package files with this form only when a stable public import improves readability:

```python
from app.services.agents.service import AgentService

__all__ = ["AgentService"]
```

Do not use wildcard re-exports.

- [ ] **Step 3: Update exact imports and patch paths**

Use `git grep -n -E 'auth_service|srv_user|workspace_srv|workspace_member_srv|agent_srv|chat_srv|gcs_storage_srv' -- backend` as the exhaustive edit list. Update production imports and test monkeypatch strings together.

- [ ] **Step 4: Run application-domain tests**

```bash
uv run --project backend pytest \
  backend/tests/api/test_auth.py \
  backend/tests/api/test_user.py \
  backend/tests/api/test_workspace.py \
  backend/tests/api/test_agent_api.py \
  backend/tests/services/test_auth_service.py \
  backend/tests/services/test_workspace_services.py \
  backend/tests/services/test_agents_service.py \
  backend/tests/services/test_agent_chat_paths.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit application service moves**

Run `detect_changes({scope: "staged"})`; expected processes are auth, user, workspace, agent CRUD, and chat only.

```bash
git add backend/app/services backend/app/api backend/app/temporal backend/tests
git commit -m "refactor: group application services by domain"
```

### Task 5: Correct Knowledge and connector ownership

**Files:** Knowledge/connector move manifest and all importers/tests.

- [ ] **Step 1: Move the misspelled Knowledge package**

Before moving, run upstream impact for `run_extraction_agent` and `run_evidence_extraction_agent`. Their service, activity, and test consumers must move in the same commit.

```bash
git mv backend/app/services/knowalge_base backend/app/services/knowledge
mkdir -p backend/app/services/knowledge/ingestion backend/app/services/knowledge/extraction backend/app/services/knowledge/graph backend/app/services/knowledge/retrieval backend/app/services/knowledge/discovery backend/app/services/knowledge/memory_state backend/app/services/knowledge/repositories backend/app/services/connectors
```

Use `apply_patch` to create each new `__init__.py` with a responsibility-specific docstring and no eager imports.

- [ ] **Step 2: Move remaining Knowledge and connector modules**

Run:

```bash
git mv backend/app/services/knowledge_base_srv.py backend/app/services/knowledge/documents.py
git mv backend/app/services/knowledge_graph_srv.py backend/app/services/knowledge/graph/api_service.py
git mv backend/app/services/srv_topic.py backend/app/services/knowledge/discovery/topics.py
git mv backend/app/services/connector_ingestion_gateway.py backend/app/services/connectors/ingestion_gateway.py
git mv backend/app/services/connector_state_repository.py backend/app/services/connectors/state_repository.py
git mv backend/app/services/source_sync_service.py backend/app/services/connectors/source_sync.py
git mv backend/app/services/knowledge_catalog_repository.py backend/app/services/knowledge/discovery/catalog_repository.py
git mv backend/app/services/knowledge_catalog_service.py backend/app/services/knowledge/discovery/catalog_service.py
git mv backend/app/services/context_discovery_service.py backend/app/services/knowledge/discovery/context_service.py
git mv backend/app/services/discovery_projection_service.py backend/app/services/knowledge/discovery/projection_service.py
git mv backend/app/services/discovery_snapshot_repository.py backend/app/services/knowledge/discovery/snapshot_repository.py
git mv backend/app/services/discovery_snapshot_service.py backend/app/services/knowledge/discovery/snapshot_service.py
git mv backend/app/services/topic_discovery_helpers.py backend/app/services/knowledge/discovery/topic_helpers.py
git mv backend/app/services/topic_discovery_repository.py backend/app/services/knowledge/discovery/topic_repository.py
git mv backend/app/services/topic_discovery_service.py backend/app/services/knowledge/discovery/topic_service.py
git mv backend/app/services/topic_resolver.py backend/app/services/knowledge/discovery/topic_resolver.py
git mv backend/app/services/memory_state_repository.py backend/app/services/knowledge/memory_state/repository.py
git mv backend/app/services/memory_state_service.py backend/app/services/knowledge/memory_state/service.py
git mv backend/app/services/snapshot_observability.py backend/app/services/knowledge/observability.py
git mv backend/tests/services/test_srv_topic.py backend/tests/services/test_topics_service.py
git mv backend/tests/services/test_knowledge_graph_srv.py backend/tests/services/test_knowledge_graph_api_service.py
```

- [ ] **Step 3: Group existing Knowledge files by responsibility**

Run:

```bash
git mv backend/app/services/knowledge/ingestion_start_service.py backend/app/services/knowledge/ingestion/start_service.py
git mv backend/app/services/knowledge/ingestion_workflow_starter.py backend/app/services/knowledge/ingestion/workflow_starter.py
git mv backend/app/services/knowledge/ingestion_service.py backend/app/services/knowledge/ingestion/service.py
git mv backend/app/services/knowledge/ingestion_helpers.py backend/app/services/knowledge/ingestion/helpers.py
git mv backend/app/services/knowledge/parser_service.py backend/app/services/knowledge/ingestion/parser.py
git mv backend/app/services/knowledge/chunking_service.py backend/app/services/knowledge/ingestion/chunking.py
git mv backend/app/services/knowledge/staging_service.py backend/app/services/knowledge/ingestion/staging.py
git mv backend/app/services/knowledge/staging_sql.py backend/app/services/knowledge/ingestion/staging_sql.py
git mv backend/app/services/knowledge/publish_service.py backend/app/services/knowledge/ingestion/publish.py
git mv backend/app/services/knowledge/cleanup.py backend/app/services/knowledge/ingestion/cleanup.py

git mv backend/app/services/knowledge/entity_resolution_repository.py backend/app/services/knowledge/graph/entity_resolution_repository.py
git mv backend/app/services/knowledge/entity_resolution_service.py backend/app/services/knowledge/graph/entity_resolution_service.py
git mv backend/app/services/knowledge/graph_projection_repository.py backend/app/services/knowledge/graph/projection_repository.py
git mv backend/app/services/knowledge/graph_projection_service.py backend/app/services/knowledge/graph/projection_service.py
git mv backend/app/services/knowledge/graph_semantic_projection_service.py backend/app/services/knowledge/graph/semantic_projection_service.py
git mv backend/app/services/knowledge/graph_semantic_repository.py backend/app/services/knowledge/graph/semantic_repository.py
git mv backend/app/services/knowledge/graph_semantic_service.py backend/app/services/knowledge/graph/semantic_service.py
git mv backend/app/services/knowledge/graph_semantic_writer.py backend/app/services/knowledge/graph/semantic_writer.py
git mv backend/app/services/knowledge/graph_snapshot_semantic_validator.py backend/app/services/knowledge/graph/snapshot_semantic_validator.py
git mv backend/app/services/knowledge/graph_snapshot_service.py backend/app/services/knowledge/graph/snapshot_service.py
git mv backend/app/services/knowledge/canonical_semantic_graph_loader.py backend/app/services/knowledge/graph/canonical_loader.py

git mv backend/app/services/knowledge/retriever_service.py backend/app/services/knowledge/retrieval/retriever.py
git mv backend/app/services/knowledge/retriever_helpers.py backend/app/services/knowledge/retrieval/helpers.py
git mv backend/app/services/knowledge/tgs_retriever.py backend/app/services/knowledge/retrieval/tgs_retriever.py
git mv backend/app/services/knowledge/tgs_models.py backend/app/services/knowledge/retrieval/models.py
git mv backend/app/services/knowledge/canonical_query_repository.py backend/app/services/knowledge/retrieval/query_repository.py
git mv backend/app/services/knowledge/knowledge_query_service.py backend/app/services/knowledge/retrieval/query_service.py
git mv backend/app/services/knowledge/memory_query_factory.py backend/app/services/knowledge/retrieval/query_factory.py
git mv backend/app/services/knowledge/memory_provenance.py backend/app/services/knowledge/retrieval/provenance.py
git mv backend/app/services/knowledge/resource_service.py backend/app/services/knowledge/retrieval/resources.py

git mv backend/app/services/knowledge/evidence_repository.py backend/app/services/knowledge/extraction/evidence_repository.py
git mv backend/app/services/knowledge/evidence_service.py backend/app/services/knowledge/extraction/evidence_service.py
git mv backend/app/services/knowledge/evidence_workflow_service.py backend/app/services/knowledge/extraction/workflow_service.py
git mv backend/app/services/knowledge/canonical_chunk_loader.py backend/app/services/knowledge/extraction/chunk_loader.py
git mv backend/app/services/knowledge/fusion_service.py backend/app/services/knowledge/extraction/fusion.py
git mv backend/app/services/knowledge/prompts.py backend/app/services/knowledge/extraction/prompts.py
git mv backend/app/services/knowledge/utils.py backend/app/services/knowledge/extraction/utils.py
git mv backend/app/agents/extractor backend/app/services/knowledge/extraction/agent
```

Keep repository suffixes where the module owns persistence. Do not merge cohesive files during the move.

- [ ] **Step 4: Update all Knowledge imports**

Use this scan until it returns no matches:

```bash
git grep -n -E 'knowalge_base|knowledge_base_srv|knowledge_graph_srv|srv_topic|connector_ingestion_gateway|connector_state_repository|source_sync_service|knowledge_catalog_|context_discovery_service|discovery_(projection|snapshot)_|topic_discovery_|topic_resolver|memory_state_(repository|service)|snapshot_observability|app\.agents\.extractor' -- backend
```

Update test monkeypatch module strings in the same commit. Do not leave re-export shims at old paths.

- [ ] **Step 5: Run Knowledge, connector, agent, and Temporal suites**

```bash
uv run --project backend pytest \
  backend/tests/connectors \
  backend/tests/services \
  backend/tests/agents \
  backend/tests/temporal \
  backend/tests/evaluation -q
```

Expected: PASS.

- [ ] **Step 6: Commit Knowledge ownership**

Run `detect_changes({scope: "staged"})`; this move is expected to touch many modules but must not alter process count or route shapes.

```bash
git add backend/app/services backend/app/agents backend/app/api backend/app/temporal backend/workers backend/tests
git commit -m "refactor: organize knowledge and connector services"
```

### Task 6: Move RAG records out of database infrastructure

**Files:** RAG record/repository move manifest and all importers/tests.

- [ ] **Step 1: Impact-check `RagBase` and record classes**

Invoke upstream `impact` for `RagBase`, `DocumentRevisionRecord`, `ChunkRecord`, `StagedBaseChunkRecord`, `GraphSnapshotRecord`, and `MemoryStateProjectionRecord`. Record migration, repository, service, and test consumers.

- [ ] **Step 2: Move records and tenant repository**

```bash
mkdir -p backend/app/models/rag
git mv backend/app/db/rag_models.py backend/app/models/rag/records.py
git mv backend/app/db/rag_graph_models.py backend/app/models/rag/graph.py
git mv backend/app/db/rag_staging_models.py backend/app/models/rag/staging.py
git mv backend/app/db/rag_memory_state_models.py backend/app/models/rag/memory_state.py
git mv backend/app/models/topic.py backend/app/models/rag/topics.py
git mv backend/app/db/rag_repository.py backend/app/services/knowledge/repositories/tenant.py
```

Use `apply_patch` to create `backend/app/models/rag/__init__.py`:

```python
"""Physical SQLAlchemy records owned by the RAG database."""
```

Keep `rag_db.py`, `database.py`, `checkpoint.py`, and database adapters in `app/db/`.

- [ ] **Step 3: Update model and repository imports**

Preserve every imported symbol and change only module ownership: base/revision/evidence records come from `app.models.rag.records`; resolution/projection/snapshot records come from `app.models.rag.graph`; staged records come from `app.models.rag.staging`; memory-state records come from `app.models.rag.memory_state`; Topic records come from `app.models.rag.topics`; tenant repository types come from `app.services.knowledge.repositories.tenant`.

In `app.models.rag.topics`, delete its independent `declarative_base()` and import the canonical base:

```python
from app.models.rag.records import RagBase
```

Make `Topic`, `TopicMembership`, `TopicAlias`, and `TopicUpdateQueue` inherit `RagBase`.

Update every importer returned by:

```bash
git grep -n -E 'app\.db\.rag_(models|graph_models|staging_models|memory_state_models|repository)|app\.models\.topic' -- backend
```

- [ ] **Step 4: Run model, repository, migration-contract, and architecture tests**

```bash
uv run --project backend pytest \
  backend/tests/models \
  backend/tests/security/test_rag_repository.py \
  backend/tests/migrations/test_rag_migration_contract.py \
  backend/tests/architecture -q
```

Expected: PASS for record ownership tests except the thin-activity test, which is completed next.

- [ ] **Step 5: Commit record ownership**

Run `detect_changes({scope: "staged"})`, then:

```bash
git add backend/app/models backend/app/db backend/app/services backend/tests
git commit -m "refactor: move rag records to model layer"
```

### Task 7: Make Temporal activities thin service adapters

**Files:**

- Modify: `backend/app/temporal/activities/invitation.py`
- Modify: `backend/app/temporal/activities/topic.py`
- Create: `backend/app/services/workspaces/invitations.py`
- Create: `backend/app/services/knowledge/discovery/topic_summary.py`
- Modify: focused activity/service tests

- [ ] **Step 1: Move invitation lookup/composition into a service**

Create:

```python
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation


@dataclass(frozen=True, slots=True)
class InvitationEmail:
    recipient: str
    subject: str
    body: str


class InvitationNotificationService:
    @staticmethod
    async def build_email(db: AsyncSession, invitation_id: UUID) -> InvitationEmail:
        invitation_result = await db.execute(
            select(WorkspaceInvitation).where(
                WorkspaceInvitation.id == invitation_id
            )
        )
        invitation = invitation_result.scalar_one_or_none()
        if invitation is None:
            raise ResourceNotFoundError("Workspace invitation not found")

        workspace_result = await db.execute(
            select(Workspace).where(Workspace.id == invitation.workspace_id)
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace is None:
            raise ResourceNotFoundError("Invitation workspace not found")

        inviter_result = await db.execute(
            select(User).where(User.firebase_uid == invitation.invited_by)
        )
        inviter = inviter_result.scalar_one_or_none()
        inviter_name = inviter.full_name if inviter else "A workspace administrator"
        inviter_email = inviter.email if inviter else invitation.invited_by
        body = (
            f'You were invited to join "{workspace.name}" on FLAE by '
            f"{inviter_name} ({inviter_email}) with role "
            f"{invitation.role.value}.\n\n"
            f"Accept: http://localhost:4200/invite?token={invitation.token}\n"
            f"Expires: {invitation.expires_at.isoformat()}"
        )
        return InvitationEmail(
            recipient=invitation.email,
            subject=f"Invitation to {workspace.name}",
            body=body,
        )
```

Move the existing invitation, workspace, and inviter queries plus message composition from the activity into `build_email`. Replace boolean/not-found returns with `ResourceNotFoundError` and invalid UUID handling with `InvalidArgumentError`.

The activity becomes:

```python
@activity.defn
async def send_invitation_email(invitation_id: str) -> bool:
    try:
        parsed_id = UUID(invitation_id)
    except ValueError as error:
        raise InvalidArgumentError("Invalid invitation ID") from error
    async with AsyncSessionLocal() as db:
        message = await InvitationNotificationService.build_email(
            db,
            parsed_id,
        )
    logger.info("Invitation email prepared for %s", message.recipient)
    return True
```

Do not log the token or body.

- [ ] **Step 2: Move topic summary transactions into a service**

Create `TopicSummaryService.update(workspace_id: str, topic_id: str) -> dict[str, object]`. Move the existing database queries, queue state transitions, prompt construction, provider call, embedding update, and commits from `update_topic_summary_activity` into that service without changing ordering.

The activity becomes:

```python
@activity.defn
async def update_topic_summary_activity(params: dict[str, str]) -> dict[str, object]:
    return await TopicSummaryService().update(
        workspace_id=params["workspace_id"],
        topic_id=params["topic_id"],
    )
```

- [ ] **Step 3: Add focused service tests before deleting activity internals**

Test these exact outcomes:

- invalid/missing invitation raises the matching custom exception;
- invitation body is produced without logging the token;
- missing topic returns `{"status": "skipped", "reason": "Topic not found"}`;
- no evidence completes the queue and returns the no-evidence result;
- provider failure marks the queue failed and raises a custom external-service exception;
- success updates summary, current state, embedding, and queue status in one service-owned transaction sequence.

- [ ] **Step 4: Run service/activity/architecture tests**

```bash
uv run --project backend pytest \
  backend/tests/services/test_workspace_services.py \
  backend/tests/services/test_topics_service.py \
  backend/tests/temporal/test_activities.py \
  backend/tests/architecture/test_backend_rules.py -q
```

Expected: PASS, including `test_temporal_activities_do_not_execute_database_transactions`.

- [ ] **Step 5: Commit thin activity adapters**

Run `detect_changes({scope: "staged"})`; expected processes are invitation notification and topic summary only.

```bash
git add backend/app/services backend/app/temporal backend/tests
git commit -m "refactor: move temporal business logic into services"
```

### Task 8: Move Chat ownership out of the Agents frontend feature

**Files:**

- Create: `frontend/src/features/chat/schemas/chat-schema.ts`
- Create: `frontend/src/features/chat/types/chat.ts`
- Create: `frontend/src/features/chat/api/chat-sessions-api.ts`
- Create: `frontend/src/features/chat/api/chat-sessions-runtime-api.ts`
- Move: `frontend/src/features/agents/hooks/use-sessions.ts` to `frontend/src/features/chat/hooks/use-conversations.ts`
- Move: `frontend/src/features/agents/ui/ChatMessage.tsx` to `frontend/src/features/chat/ui/ChatMessage.tsx`
- Move: `frontend/src/features/agents/ui/ChatMessage.test.tsx` to `frontend/src/features/chat/ui/ChatMessage.test.tsx`
- Move: `frontend/src/features/agents/ui/CitationList.tsx` to `frontend/src/features/chat/ui/CitationList.tsx`
- Modify: Agent schema/type/API modules and all Chat consumers/tests

- [ ] **Step 1: Impact-check Chat ownership symbols**

Run upstream impact for `ChatExperience`, `ChatMessage`, `CitationList`, `useSessions`, `useMessages`, `useSessionActions`, `chatSessionSchema`, and `chatMessageSchema`.

- [ ] **Step 2: Extract Chat Zod schemas and types**

Move `citationSchema`, `chatMessageSchema`, `chatSessionCreateSchema`, and `chatSessionSchema` from `agents/schemas/agent-schema.ts` into `chat/schemas/chat-schema.ts` with their existing definitions and tests.

Create `chat/types/chat.ts`:

```ts
import { z } from "zod";

import {
  chatMessageSchema,
  chatSessionCreateSchema,
  chatSessionSchema,
  citationSchema,
} from "../schemas/chat-schema";

export type ChatSession = z.output<typeof chatSessionSchema>;
export type ChatSessionCreatePayload = z.input<typeof chatSessionCreateSchema>;
export type Citation = z.output<typeof citationSchema>;
export type ChatMessage = z.output<typeof chatMessageSchema>;
```

Remove Chat types from `agents/types/agent.ts`.

- [ ] **Step 3: Split session/message API calls from Agent CRUD**

Move `listSessions`, `createSession`, `deleteSession`, and `listMessages` plus their path/validation helpers into `chat/api/chat-sessions-api.ts`. Keep `listAgents`, `getAgent`, `getDefaultAgent`, `createAgent`, `updateAgent`, and `deleteAgent` in `agents-api.ts`.

Create a Chat runtime adapter matching the existing Agents runtime adapter pattern. `use-conversations.ts` imports only the Chat runtime adapter and Chat types.

- [ ] **Step 4: Apply graph-aware hook renames**

Preview and apply:

```text
useSessions -> useConversationSessions
useMessages -> useConversationMessages
useSessionActions -> useConversationActions
```

Update `ChatExperience` to use the canonical names.

- [ ] **Step 5: Move Chat UI modules**

```bash
git mv frontend/src/features/agents/hooks/use-sessions.ts frontend/src/features/chat/hooks/use-conversations.ts
git mv frontend/src/features/agents/hooks/use-sessions.test.tsx frontend/src/features/chat/hooks/use-conversations.test.tsx
git mv frontend/src/features/agents/ui/ChatMessage.tsx frontend/src/features/chat/ui/ChatMessage.tsx
git mv frontend/src/features/agents/ui/ChatMessage.test.tsx frontend/src/features/chat/ui/ChatMessage.test.tsx
git mv frontend/src/features/agents/ui/CitationList.tsx frontend/src/features/chat/ui/CitationList.tsx
```

Chat UI may import `AgentDetail` and avatar presentation from Agents because an agent is display context. Agents must not import Chat session/message/citation internals except `AgentChatPage`, which composes `ChatExperience` as a page boundary.

- [ ] **Step 6: Rename query keys**

Use GitNexus rename:

```text
agentSessions -> chatSessions
agentMessages -> chatMessages
```

Keep the key tuples’ workspace/agent/session identity and invalidation behavior unchanged.

- [ ] **Step 7: Run Chat and Agent tests**

```bash
npm --prefix frontend run test -- \
  chat-schema.test.ts \
  agents-api.test.ts \
  chat-sessions-api.test.ts \
  use-conversations.test.tsx \
  ChatExperience.test.tsx \
  ChatMessage.test.tsx \
  AgentChatPage.test.tsx \
  architecture-boundaries.test.ts
npm --prefix frontend run typecheck
npm --prefix frontend run lint
```

Expected: PASS.

- [ ] **Step 8: Commit frontend domain ownership**

Run `detect_changes({scope: "staged"})`; expected frontend Chat and Agent composition flows only.

```bash
git add frontend/src frontend/tests
git commit -m "refactor: make chat own conversation capability"
```

### Task 9: Verify Plan 3 completion

**Files:** No new production files.

- [ ] **Step 1: Scan forbidden paths and imports**

```bash
git grep -n -E 'knowalge_base|app\.schemas\.sche_|app\.services\.(srv_|agent_srv|chat_srv|workspace_srv|workspace_member_srv|auth_service)|app\.db\.rag_(models|graph_models|staging_models|memory_state_models|repository)|app\.api\.v1\.endpoints' -- backend frontend
```

Expected: no matches.

- [ ] **Step 2: Run structural checks**

```bash
uv run --project backend pytest backend/tests/architecture -q
uv run --project backend python backend/scripts/check_file_size.py
npm --prefix frontend run check:file-size
```

Expected: PASS and no file exceeds 450 lines.

- [ ] **Step 3: Run complete suites**

```bash
uv run --project backend pytest
uv run --project backend pyrefly check
npm --prefix frontend run test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all commands exit `0`.

- [ ] **Step 4: Check import cycles and process impact**

Invoke:

```text
check({repo: "flae-agents", cycles: true})
detect_changes({scope: "compare", base_ref: "cleanup-base-2026-08-11"})
```

Expected: no import cycles; route/process behavior is unchanged except the approved path ownership and removed product surfaces.
