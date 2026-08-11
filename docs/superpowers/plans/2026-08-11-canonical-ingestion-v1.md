# Canonical Ingestion V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the current references-only ingestion implementation to the single official V1 contract and remove the legacy pipeline plus all transition infrastructure.

**Architecture:** A shared `IngestionWorkflowStarter` owns the one Temporal composition used by manual uploads, file uploads, and connectors. Internal code uses canonical names, while the durable Temporal type is `KnowledgeIngestionWorkflowV1` and persisted metadata records V1.

**Tech Stack:** FastAPI services, Pydantic, SQLAlchemy, GCS, Temporal Python SDK, pytest, uv, Docker Compose, GitNexus.

---

## High-risk warning

Treat this plan as HIGH risk even when GitNexus returns LOW or partial impact. Temporal workflow/activity registration, replay compatibility, dynamically imported workflows, and connector adapters are not completely represented in the static graph. Do not delete the legacy path until the canonical starter, workflow, activities, workers, and characterization suites pass together.

## Canonical names

| Current | Canonical |
|---|---|
| `app.schemas.ingestion_v2` | `app.schemas.ingestion` |
| `IngestionV2Model` | `IngestionModel` |
| `IngestionWorkflowV2Input` | `IngestionWorkflowInput` |
| `IngestionV2BootstrapInput` | `IngestionBootstrapInput` |
| `IngestionWorkflowV2Output` | `IngestionWorkflowOutput` |
| `V2DocumentStatusInput` | `DocumentIngestionStatusInput` |
| `IngestionV2StartService` | `IngestionStartService` |
| `chunk_document_v2` | `chunk_document` |
| `IngestionWorkflowV2` | `IngestionWorkflow` |
| `update_v2_document_status_activity` | `update_document_status_activity` |
| `flae_ingestion_worker.py` | `knowledge_worker.py` |
| `flae_worker.py` | `application_worker.py` |
| `create_ingestion_worker` | `create_knowledge_worker` |
| `TEMPORAL_INGESTION_TASK_QUEUE` | `TEMPORAL_KNOWLEDGE_TASK_QUEUE` |
| `INGESTION_V2_MAX_PARALLEL_BATCHES` | `KNOWLEDGE_MAX_PARALLEL_BATCHES` |
| `INGESTION_V2_MAX_CONCURRENT_WORKFLOWS` | `KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS` |
| `INGESTION_V2_MAX_CONCURRENT_ACTIVITIES` | `KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES` |
| `INGESTION_V2_TASK_QUEUE_ACTIVITIES_PER_SECOND` | `KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND` |

## Delete after cutover

- `backend/app/temporal/workflows/ingestion.py` legacy contents
- `backend/app/temporal/activities/ingestion.py` legacy contents
- `backend/app/services/ingestion_rollout_service.py`
- `backend/app/services/ingestion_compatibility_audit_repository.py`
- `backend/app/services/ingestion_v1_retirement_service.py`
- `backend/scripts/check_ingestion_v1_retirement.py`
- `backend/tests/services/test_ingestion_rollout_policy.py`
- `backend/tests/services/test_ingestion_compatibility_audit_repository.py`
- `backend/tests/services/test_ingestion_v1_retirement_service.py`
- `backend/tests/temporal/test_ingestion_v1_replay.py`
- `docs/operations/ingestion_v1_retirement.md`
- `docs/ingestion_pipeline_optimization_plan.md`

### Task 1: Freeze retained ingestion behavior

**Files:** Existing ingestion, connector, parity, and Temporal tests.

- [ ] **Step 1: Run upstream impact analysis for every renamed symbol**

Invoke `impact` with `direction="upstream"`, `includeTests=true`, and `maxDepth=3` for every entry in the canonical-name table that is a function or class. Use the current file path to disambiguate.

Example:

```text
impact({
  target: "IngestionWorkflowV2",
  file_path: "backend/app/temporal/workflows/ingestion_v2.py",
  direction: "upstream",
  includeTests: true,
  maxDepth: 3
})
```

Expected: capture direct consumers from company-memory workflows, connector gateway, workers, and tests. Warn before editing if any result is HIGH or CRITICAL.

- [ ] **Step 2: Run the retained characterization suite before renaming**

```bash
uv run --project backend pytest \
  backend/tests/services/test_ingestion_v2_start.py \
  backend/tests/services/test_atomic_base_publish.py \
  backend/tests/services/test_connector_ingestion_gateway.py \
  backend/tests/temporal/test_base_staging.py \
  backend/tests/temporal/test_ingestion_v2_activities.py \
  backend/tests/temporal/test_ingestion_v2_workflow.py \
  backend/tests/temporal/test_company_memory_ingestion_workflow.py \
  backend/tests/temporal/test_ingestion_worker_capacity.py \
  backend/tests/evaluation/test_tgs_ingestion_parity.py -q
```

Expected: PASS. Stop if the retained implementation is not green before cutover.

- [ ] **Step 3: Add a durable workflow-type assertion**

Add this test to `backend/tests/temporal/test_ingestion_v2_workflow.py` before renaming:

```python
def test_ingestion_workflow_uses_the_first_official_durable_type() -> None:
    assert IngestionWorkflowV2.__temporal_workflow_definition.name == (
        "KnowledgeIngestionWorkflowV1"
    )
```

- [ ] **Step 4: Run the new test and verify it fails**

```bash
uv run --project backend pytest \
  backend/tests/temporal/test_ingestion_v2_workflow.py::test_ingestion_workflow_uses_the_first_official_durable_type -q
```

Expected: FAIL because the workflow is still registered as `IngestionWorkflowV2`.

### Task 2: Canonicalize ingestion schemas and services with graph-aware renames

**Files:**

- Rename: `backend/app/schemas/ingestion_v2.py` to `backend/app/schemas/ingestion.py`
- Rename: `backend/app/services/knowalge_base/ingestion_v2_start_service.py` to `backend/app/services/knowalge_base/ingestion_start_service.py`
- Rename: `backend/tests/services/test_ingestion_v2_start.py` to `backend/tests/services/test_ingestion_start.py`
- Modify: every importer reported by impact analysis

- [ ] **Step 1: Preview and apply each symbol rename**

For each symbol in this list, invoke `rename` first with `dry_run=true`, review every graph and text-search edit, then invoke it with `dry_run=false`:

```text
IngestionV2Model -> IngestionModel
IngestionWorkflowV2Input -> IngestionWorkflowInput
IngestionV2BootstrapInput -> IngestionBootstrapInput
IngestionWorkflowV2Output -> IngestionWorkflowOutput
V2DocumentStatusInput -> DocumentIngestionStatusInput
IngestionV2StartService -> IngestionStartService
chunk_document_v2 -> chunk_document
```

Example:

```text
rename({
  symbol_name: "IngestionWorkflowV2Input",
  file_path: "backend/app/schemas/ingestion_v2.py",
  new_name: "IngestionWorkflowInput",
  dry_run: true
})
```

Do not accept a low-confidence text edit without reading its containing file.

- [ ] **Step 2: Rename schema, service, and test files**

```bash
git mv backend/app/schemas/ingestion_v2.py backend/app/schemas/ingestion.py
git mv backend/app/services/knowalge_base/ingestion_v2_start_service.py backend/app/services/knowalge_base/ingestion_start_service.py
git mv backend/tests/services/test_ingestion_v2_start.py backend/tests/services/test_ingestion_start.py
```

- [ ] **Step 3: Set official V1 metadata defaults and messages**

In `IngestionBootstrapInput`, use:

```python
pipeline_version: str = Field(default="v1", min_length=1, max_length=200)
parser_version: str = Field(default="markdown-v1", min_length=1, max_length=200)
chunker_version: str = Field(default="structure-v1", min_length=1, max_length=200)
```

Change the source-reference validation message to:

```python
raise ValueError("ingestion requires a secret-free gcs:// reference")
```

Change the start-service module docstring to:

```python
"""Idempotent revision/run bootstrap for canonical ingestion starts."""
```

Use workflow IDs in the form:

```python
workflow_id = f"knowledge-ingestion-v1-{run_id}"
```

- [ ] **Step 4: Rename test functions and expected metadata**

Rename test names from `test_v2_*` to `test_ingestion_*`. Replace expected values:

```text
pipeline-v2 -> v1
markdown-v2 -> markdown-v1
structure-v2 -> structure-v1
kb-ingest-v2- -> knowledge-ingestion-v1-
```

These replacements are limited to ingestion contract fixtures and assertions; do not alter unrelated semantic/evaluation version strings without an owning test.

- [ ] **Step 5: Run schema/start-service tests**

```bash
uv run --project backend pytest \
  backend/tests/services/test_ingestion_start.py \
  backend/tests/temporal/test_base_staging.py \
  backend/tests/services/test_atomic_base_publish.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit canonical schemas and bootstrap service**

Invoke `detect_changes({scope: "staged"})` after staging. Expected: schema, bootstrap, staging, publish, connector, and their tests only.

```bash
git add backend/app/schemas backend/app/services/knowalge_base backend/app/services/connector_ingestion_gateway.py backend/tests
git commit -m "refactor: establish canonical ingestion v1 contracts"
```

### Task 3: Create one shared ingestion workflow starter

**Files:**

- Modify: `backend/app/services/knowalge_base/ingestion_workflow_starter.py`
- Modify: `backend/app/services/connector_ingestion_gateway.py`
- Modify: `backend/app/services/knowledge_base_srv.py`
- Modify: `backend/tests/services/test_ingestion_start.py`
- Modify: `backend/tests/services/test_connector_ingestion_gateway.py`

- [ ] **Step 1: Write tests for one canonical starter**

In `test_ingestion_start.py`, replace flag-routing tests with:

```python
@pytest.mark.asyncio
async def test_document_start_always_uses_the_canonical_knowledge_workflow(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = AsyncMock()
    source = _source_reference()
    prepare = AsyncMock(return_value=source)
    monkeypatch.setattr(ingestion_workflow_starter, "get_temporal_client", AsyncMock(return_value=client))
    monkeypatch.setattr(
        ingestion_workflow_starter,
        "IngestionStartService",
        lambda _manager: SimpleNamespace(prepare_reference=prepare),
    )

    workflow_id = await ingestion_workflow_starter.start_ingestion_workflow(
        _knowledge_document(gcs_path="documents/source.md", checksum="sha256:" + "a" * 64)
    )

    assert workflow_id == f"knowledge-ingestion-v1-{source.ingestion_run_id}"
    client.start_workflow.assert_awaited_once()
    assert client.start_workflow.await_args.kwargs["task_queue"] == (
        settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE
    )
```

Add a second test that constructs a document without `gcs_path` and asserts:

```python
with pytest.raises(InvalidArgumentError, match="checksummed GCS reference"):
    await ingestion_workflow_starter.start_ingestion_workflow(document)
```

In connector gateway tests, assert the injected workflow starter receives the prepared `SourceRevisionReference`; do not mock a second direct `TemporalClient.start_workflow` path.

- [ ] **Step 2: Run the new starter tests and verify they fail**

```bash
uv run --project backend pytest \
  backend/tests/services/test_ingestion_start.py \
  backend/tests/services/test_connector_ingestion_gateway.py -q
```

Expected: FAIL because flags/fallback and connector Temporal duplication still exist.

- [ ] **Step 3: Implement the canonical starter class**

The starter module must expose this interface:

```python
class TemporalWorkflowClient(Protocol):
    async def start_workflow(
        self,
        workflow: object,
        arg: DiscoverableMemoryIngestionWorkflowInput,
        *,
        id: str,
        task_queue: str,
        id_conflict_policy: WorkflowIDConflictPolicy,
        id_reuse_policy: WorkflowIDReusePolicy,
    ) -> object:
        pass


class IngestionWorkflowStarter:
    def __init__(self, client: TemporalWorkflowClient) -> None:
        self._client = client

    async def start(
        self,
        source: SourceRevisionReference,
        *,
        update_core_document_status: bool,
    ) -> str:
        workflow_id = f"knowledge-ingestion-v1-{source.ingestion_run_id}"
        command = DiscoverableMemoryIngestionWorkflowInput(
            memory=CompanyMemoryIngestionWorkflowInput(
                base=IngestionWorkflowInput(
                    source=source,
                    max_parallel_batches=min(
                        settings.KNOWLEDGE_MAX_PARALLEL_BATCHES,
                        16,
                    ),
                    update_core_document_status=update_core_document_status,
                ),
                semantic_graph=SemanticGraphEnrichmentWorkflowInput(
                    workspace_id=source.workspace_id,
                    resolver_version="resolver-v1",
                    projection_version="projection-v1",
                    semantic_profile=DemoIngestionProfile(
                        profile_version="demo-reference-v1",
                        embedding_model=settings.GEMINI_EMBEDDING_MODEL,
                        embedding_dimension=settings.EMBEDDING_DIMENSIONS,
                        embedding_policy_version="semantic-input-v1",
                    ),
                ),
                evidence_model_name=settings.GEMINI_LLM_MODEL,
                evidence_glean_max=settings.RAG_GLEAN_MAX,
                max_parallel_evidence_chunks=min(
                    settings.KNOWLEDGE_MAX_PARALLEL_BATCHES,
                    16,
                ),
            )
        )
        await self._client.start_workflow(
            DiscoverableMemoryIngestionWorkflow.run,
            command,
            id=workflow_id,
            task_queue=settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE,
            id_conflict_policy=WorkflowIDConflictPolicy.USE_EXISTING,
            id_reuse_policy=WorkflowIDReusePolicy.REJECT_DUPLICATE,
        )
        return workflow_id
```

`start_ingestion_workflow(doc)` must validate `doc.gcs_path` and `doc.content_checksum`, prepare the reference through `IngestionStartService`, obtain the Temporal client, and delegate to `IngestionWorkflowStarter.start(source, update_core_document_status=True)`.

- [ ] **Step 4: Make connector ingestion use the shared starter**

Change `ConnectorIngestionGateway.__init__` to accept:

```python
start_service: ConnectorReferencePreparer
workflow_starter: IngestionWorkflowStarter
publisher: ConnectorRevisionPublisher
```

After preparing the source, call:

```python
await self._workflow_starter.start(
    source,
    update_core_document_status=False,
)
```

Delete the connector’s direct Temporal protocol, direct workflow import, duplicate workflow ID, and duplicate retry policy.

- [ ] **Step 5: Always upload manual input before canonical ingestion**

In `KnowledgeBaseService.create_manual_document`, remove the V2 flag branch. Always set:

```python
file_name = f"document-{doc_id}.md"
gcs_path = await GCSStorageService.upload_file(
    workspace_id=workspace_id,
    document_id=doc_id,
    file_name=file_name,
    file_content=content_bytes,
    content_type="text/markdown",
)
```

Keep the checksum derived from the exact uploaded bytes.

- [ ] **Step 6: Run starter, connector, and knowledge API tests**

```bash
uv run --project backend pytest \
  backend/tests/services/test_ingestion_start.py \
  backend/tests/services/test_connector_ingestion_gateway.py \
  backend/tests/api/test_knowledge_base.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit the one-path starter**

Run `detect_changes({scope: "staged"})`; expected affected flows are document upload, connector sync, and Company Memory ingestion only.

```bash
git add backend/app/services backend/tests/services backend/tests/api
git commit -m "refactor: route all ingestion through one starter"
```

### Task 4: Replace legacy workflow/activity files with canonical V1

**Files:**

- Delete old contents: `backend/app/temporal/workflows/ingestion.py`
- Delete old contents: `backend/app/temporal/activities/ingestion.py`
- Rename: `backend/app/temporal/workflows/ingestion_v2.py` to `backend/app/temporal/workflows/ingestion.py`
- Rename: `backend/app/temporal/activities/ingestion_v2.py` to `backend/app/temporal/activities/ingestion.py`
- Rename tests: V2 workflow/activity test files to canonical names
- Modify all importers

- [ ] **Step 1: Apply graph-aware workflow and activity symbol renames**

Preview and apply:

```text
IngestionWorkflowV2 -> IngestionWorkflow
update_v2_document_status_activity -> update_document_status_activity
```

Use GitNexus `rename`; review Temporal registration and test edits manually.

- [ ] **Step 2: Register the official durable workflow type**

The canonical workflow declaration must be:

```python
@workflow.defn(name="KnowledgeIngestionWorkflowV1")
class IngestionWorkflow:
```

Use `error_code="INGESTION_FAILED"`. Update imports to canonical schema/activity modules.

- [ ] **Step 3: Replace legacy files atomically**

```bash
git rm backend/app/temporal/workflows/ingestion.py
git rm backend/app/temporal/activities/ingestion.py
git mv backend/app/temporal/workflows/ingestion_v2.py backend/app/temporal/workflows/ingestion.py
git mv backend/app/temporal/activities/ingestion_v2.py backend/app/temporal/activities/ingestion.py
git mv backend/tests/temporal/test_ingestion_v2_workflow.py backend/tests/temporal/test_ingestion_workflow.py
git mv backend/tests/temporal/test_ingestion_v2_activities.py backend/tests/temporal/test_ingestion_activities.py
```

- [ ] **Step 4: Rename test-local activity registrations and queues**

Use:

```text
update_document_status_activity
ingestion-test
ingestion-permanent-test
ingestion-cancel-test
```

Rename `test_workflow_v2_*` functions to `test_workflow_*` and update monkeypatch module paths to `app.temporal.workflows.ingestion` and `app.temporal.activities.ingestion`.

- [ ] **Step 5: Run workflow, activity, composition, replay, and parity tests**

```bash
uv run --project backend pytest \
  backend/tests/temporal/test_ingestion_workflow.py \
  backend/tests/temporal/test_ingestion_activities.py \
  backend/tests/temporal/test_company_memory_ingestion_workflow.py \
  backend/tests/temporal/test_base_staging.py \
  backend/tests/evaluation/test_tgs_ingestion_parity.py -q
```

Expected: PASS, including the durable type assertion.

- [ ] **Step 6: Commit the canonical Temporal implementation**

Run `detect_changes({scope: "staged"})`. Expected: base ingestion and Company Memory composition only; no API-version change.

```bash
git add backend/app/temporal backend/app/schemas backend/app/services backend/tests
git commit -m "refactor: promote ingestion workflow to official v1"
```

### Task 5: Rename workers and remove version-routing settings

**Files:**

- Rename: `backend/workers/flae_worker.py` to `backend/workers/application_worker.py`
- Rename: `backend/workers/flae_ingestion_worker.py` to `backend/workers/knowledge_worker.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/.env.example`
- Modify: `.env.example`
- Modify: `backend/pyproject.toml`
- Modify: `docker-compose.yml`
- Modify: `backend/tests/temporal/test_ingestion_worker_capacity.py`

- [ ] **Step 1: Add canonical settings and worker expectations to tests**

Update the worker capacity test to assert:

```python
assert kwargs["task_queue"] == settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE
assert kwargs["max_concurrent_workflow_tasks"] == (
    settings.KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS
)
assert kwargs["max_concurrent_activities"] == (
    settings.KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES
)
assert kwargs["max_task_queue_activities_per_second"] == (
    settings.KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND
)
```

Add an application-worker registration assertion that its workflow list contains `WorkspaceInvitationWorkflow` and `TopicUpdateWorkflow`, but not `IngestionWorkflow`.

- [ ] **Step 2: Run the worker test and verify it fails**

```bash
uv run --project backend pytest backend/tests/temporal/test_ingestion_worker_capacity.py -q
```

Expected: FAIL because worker and setting names are still transition-oriented.

- [ ] **Step 3: Replace Settings fields**

Use:

```python
TEMPORAL_KNOWLEDGE_TASK_QUEUE: str = os.getenv(
    "TEMPORAL_KNOWLEDGE_TASK_QUEUE",
    "flae-knowledge-queue",
)
KNOWLEDGE_MAX_PARALLEL_BATCHES: int = int(
    os.getenv("KNOWLEDGE_MAX_PARALLEL_BATCHES", "4")
)
KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS: int = int(
    os.getenv("KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS", "20")
)
KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES: int = int(
    os.getenv("KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES", "8")
)
KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND: float = float(
    os.getenv("KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND", "10")
)
```

Delete `INGESTION_V2_ENABLED`, `INGESTION_FORCE_V1`, and `INGESTION_V2_CANARY_PERCENT`. Update the positive validators to canonical names and delete the canary validator.

- [ ] **Step 4: Rename worker files and factories**

```bash
git mv backend/workers/flae_worker.py backend/workers/application_worker.py
git mv backend/workers/flae_ingestion_worker.py backend/workers/knowledge_worker.py
```

Rename `create_ingestion_worker` to `create_knowledge_worker` with GitNexus. Remove the feature-flag early return. Register the canonical workflow and activities.

The application worker must not import or register legacy ingestion workflow/activity code.

- [ ] **Step 5: Update package scripts and Docker service names**

Use these scripts:

```toml
[project.scripts]
migrate = "scripts.migrate:run_migrations"
application-worker = "workers.application_worker:main"
knowledge-worker = "workers.knowledge_worker:main"
```

In `docker-compose.yml`, rename services and commands:

```yaml
application-worker:
  command: uv run watchfiles application-worker app workers

knowledge-worker:
  command: uv run watchfiles knowledge-worker app workers
```

Keep the existing environment, volumes, dependencies, and network settings.

- [ ] **Step 6: Update environment examples**

Use exactly:

```dotenv
TEMPORAL_KNOWLEDGE_TASK_QUEUE="flae-knowledge-queue"
KNOWLEDGE_MAX_PARALLEL_BATCHES="4"
KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS="20"
KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES="8"
KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND="10"
```

Delete every transition flag from both examples.

- [ ] **Step 7: Run settings, worker, and Compose checks**

```bash
uv run --project backend pytest backend/tests/temporal/test_ingestion_worker_capacity.py backend/tests/architecture -q
docker compose config --services
```

Expected: tests PASS; services include `application-worker` and `knowledge-worker` and exclude `flae-worker`/`flae-ingestion-worker`.

- [ ] **Step 8: Commit worker topology cleanup**

Run `detect_changes({scope: "staged"})`; expected affected modules are worker bootstrap, settings, and deployment config.

```bash
git add backend .env.example docker-compose.yml
git commit -m "refactor: name workers by runtime responsibility"
```

### Task 6: Delete transition infrastructure and obsolete tests

**Files:** Delete every path in “Delete after cutover”.

- [ ] **Step 1: Verify no production consumer remains**

```bash
git grep -n -E 'IngestionRolloutPolicy|IngestionRoute|IngestionV1Retirement|RagCompatibilityAuditRepository|DocumentIngestionWorkflow|INGESTION_FORCE_V1|INGESTION_V2_ENABLED' -- backend/app backend/workers backend/scripts
```

Expected: matches exist only inside files approved for deletion. If any retained consumer appears, update it to canonical ingestion before continuing.

- [ ] **Step 2: Delete transition code and tests**

```bash
git rm backend/app/services/ingestion_rollout_service.py
git rm backend/app/services/ingestion_compatibility_audit_repository.py
git rm backend/app/services/ingestion_v1_retirement_service.py
git rm backend/scripts/check_ingestion_v1_retirement.py
git rm backend/tests/services/test_ingestion_rollout_policy.py
git rm backend/tests/services/test_ingestion_compatibility_audit_repository.py
git rm backend/tests/services/test_ingestion_v1_retirement_service.py
git rm backend/tests/temporal/test_ingestion_v1_replay.py
git rm docs/operations/ingestion_v1_retirement.md
git rm docs/ingestion_pipeline_optimization_plan.md
```

- [ ] **Step 3: Scan all backend source for transition naming**

```bash
git grep -n -E 'IngestionV2|WorkflowV2|INGESTION_V2|INGESTION_FORCE_V1|ingestion_v2|kb-ingest-v2|flae-ingestion-v2-queue|pipeline-v2|markdown-v2|structure-v2|resolver-v2|projection-v2' -- backend ':!backend/tests/evaluation/fixtures/**'
```

Expected: no ingestion-transition matches. The unrelated LangGraph call `astream_events(inputs, config, version="v2")` is an external library protocol version and remains untouched.

- [ ] **Step 4: Run complete ingestion and connector verification**

```bash
uv run --project backend pytest \
  backend/tests/services/test_ingestion_start.py \
  backend/tests/services/test_atomic_base_publish.py \
  backend/tests/services/test_connector_ingestion_gateway.py \
  backend/tests/connectors \
  backend/tests/temporal \
  backend/tests/evaluation/test_tgs_ingestion_parity.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit transition deletion**

Run `detect_changes({scope: "staged"})`; compare against the previous canonical-ingestion commits and investigate unexpected retrieval or authorization processes.

```bash
git add backend docs
git commit -m "refactor: remove ingestion transition infrastructure"
```

### Task 7: Verify Plan 2 completion

**Files:** No additional production files.

- [ ] **Step 1: Verify exactly one new-execution workflow path**

```bash
git grep -n 'start_workflow(' -- backend/app backend/workers
git grep -n 'KnowledgeIngestionWorkflowV1' -- backend
```

Expected: ingestion callers delegate through `IngestionWorkflowStarter`; the durable workflow type is declared once and referenced by canonical tests.

- [ ] **Step 2: Run full backend verification**

```bash
uv run --project backend pytest
uv run --project backend pytest --cov=app --cov-report=term-missing
uv run --project backend pyrefly check
```

Expected: all commands exit `0`; retained backend coverage is at least 75%.

- [ ] **Step 3: Review final Plan 2 impact**

Invoke:

```text
detect_changes({scope: "compare", base_ref: "cleanup-base-2026-08-11"})
```

Expected affected processes: document upload ingestion, connector sync ingestion, base staging/publish, evidence/graph/discovery composition, and worker bootstrap. API `/api/v1`, authentication, tenant filtering, and TGS retrieval output contracts must remain unchanged.
