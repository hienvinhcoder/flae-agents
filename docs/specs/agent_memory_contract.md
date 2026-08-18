# Spec: Company Memory Ingestion, Discovery, and TGS Retrieval

**Status:** Approved direction; implementation pending
**Scope:** `rag_db`, ingestion, enrichment, discovery, retrieval, and transport-independent read capabilities
**Research basis:** [TGS-RAG, arXiv:2605.05643v1](https://arxiv.org/html/2605.05643v1)

## Assumptions

1. FLAE tự khám phá và liên tục cập nhật contexts; người dùng không phải tạo taxonomy trước khi ingest.
2. Một source, revision, chunk, entity, assertion hoặc topic có thể thuộc nhiều contexts.
3. Company Memory phải hỗ trợ đồng thời: khám phá hệ thống đang biết gì, trả lời có citation, multi-hop reasoning, phát hiện thay đổi/mâu thuẫn và chỉ ra knowledge gaps.
4. TGS-RAG là retrieval core. Contexts và topics là lớp điều hướng dẫn xuất, không thay thế graph hoặc source evidence.
5. Source revisions và extraction evidence là immutable. Aggregated entities, relationships, topics, contexts và summaries đều có thể dựng lại.
6. Lexical/vector chunks phải searchable trước khi graph/discovery enrichment hoàn tất.
7. MCP chưa nằm trong scope triển khai này. REST, MCP và internal agents về sau chỉ là adapters gọi cùng các capability services.
8. PostgreSQL/pgvector, Temporal, LangChain, LangGraph, LangSmith và Gemini tiếp tục là nền tảng hiện tại; thay dependency cần review riêng.

## Objective

Xây một Company Memory read model giúp agent bắt đầu từ bản đồ tri thức tổng quát, thu hẹp qua contexts và topic hierarchy, tìm kiếm text/graph, truy vết source evidence, rồi thực hiện multi-hop reasoning mà không mất provenance.

Thành công nghĩa là:

- Agent khám phá được các vùng tri thức mà không cần biết trước document hoặc entity name.
- Một context hoạt động như một “cuốn sách” tự cập nhật; topics là “mục lục” nhiều cấp của context đó.
- TGS retrieval giữ ánh xạ hai chiều giữa text chunks và graph để hai channel xác nhận và bổ sung cho nhau.
- Mỗi path, assertion và answer-supporting chunk truy ngược được revision, location và content hash.
- Update, delete, retry và ACL change không tạo duplicate evidence, không để graph stale được truy xuất và không rò rỉ cross-workspace/source ACL.
- Contradiction, change và gap là kết luận dựa trên evidence có thời gian, không phải suy đoán từ summary.

## Users And Core Journeys

Đối tượng chính là FLAE internal agents và third-party AI agents được cấp quyền vào workspace.

1. **Discover:** xem contexts đang tồn tại, coverage, freshness, topics và nguồn chính.
2. **Orient:** mở một context, duyệt topic tree và nhận biết entities, decisions, risks, recent changes.
3. **Investigate:** search bằng query, giới hạn context/topic/source/time và nhận text hits cùng graph paths.
4. **Reason:** mở rộng graph, giải thích path và lấy evidence cho từng hop.
5. **Verify:** đọc đúng source span/revision và phân biệt current, superseded, conflicting hoặc uncertain evidence.
6. **Audit memory:** tìm thay đổi, contradictions và các gap có định nghĩa rõ ràng.

## Scope

### In scope

- Revisioned ingestion, idempotent staging và atomic base publish.
- Structure-aware chunks với stable location/provenance.
- Immutable entity observations và assertion evidence.
- Canonical entity resolution và derived relationship projection.
- TGS knowledge base `KB=(C,G,M)` và faithful bidirectional retrieval.
- Auto-discovered overlapping topics và contexts.
- Versioned enrichment snapshots và freshness/readiness metadata.
- Transport-independent discovery, search, graph, evidence và source capabilities.
- Evaluation cho retrieval quality, multi-hop behavior, taxonomy stability, ACL và latency.

### Not doing in this plan

- MCP server, MCP tool naming, remote transport hoặc MCP OAuth.
- Mutating agent tools.
- Global community-summary indexing kiểu GraphRAG làm retrieval source of truth.
- Một ontology doanh nghiệp hoàn chỉnh hoặc causal inference không có evidence.
- Ingest đồng thời tất cả connectors; chỉ một delta-sync pilot sau khi core ổn định.
- Dùng context/topic summary làm citation hoặc answer evidence.

## Tech Stack

- Python 3.12, FastAPI, Pydantic v2 and SQLAlchemy async services.
- PostgreSQL with pgvector in `rag_db`; Alembic for every schema change.
- Temporal Python SDK for versioned ingestion/enrichment workflows.
- LangChain for model/provider adapters, structured outputs, typed tools and reusable retrieval components used by agents.
- LangGraph for stateful, multi-step agent reasoning over Company Memory, with PostgreSQL checkpointing in `flae_agent_state_db` where persistence is required.
- LangSmith for redacted agent/retrieval tracing, versioned evaluation datasets, experiments and regression analysis.
- Redis Pub/Sub only where realtime status delivery is required; it is not the evidence source of truth.
- Gemini remains the configured extraction/embedding provider behind typed service boundaries.

### Runtime responsibility boundaries

| Technology | Owns | Does not own |
|---|---|---|
| Temporal | Durable ingestion/enrichment orchestration, retries, schedules and long-running recovery | Interactive agent reasoning or conversation state |
| LangGraph | Online agent state, bounded reasoning loops, tool routing and resumable agent execution | Source ingestion durability or database publish transactions |
| LangChain | Model/tool abstractions, structured output and retrieval composition | Canonical evidence storage or authorization decisions |
| LangSmith | Tracing, datasets, experiments and quality regression analysis | Production memory, workflow state or source-of-truth evidence |

LangGraph may run a bounded extraction/reasoning subgraph inside a Temporal activity, but Temporal remains the retry and durability owner. LangSmith export is optional at runtime and must not affect correctness.

## Architectural Principles

### 1. Evidence first

Extraction output được lưu như observations/assertions gắn với revision và chunk. Canonical graph là projection có thể rebuild; không merge trực tiếp descriptions/frequency thành source of truth.

### 2. Dual speed

Base content được publish nhanh và an toàn. Graph, topic và context enrichment chạy bất đồng bộ và publish theo snapshot riêng. Enrichment failure không làm mất lexical/vector search.

### 3. TGS core, discovery overlay

Contexts/topics giúp agent định hướng nhưng không partition graph vật lý. TGS traversal được phép đi qua evidence thuộc nhiều contexts nếu authorization và query constraints cho phép.

### 4. Provenance before summaries

Summary là derived navigation metadata. Mọi factual output phải dựa vào chunk/assertion citations của current authorized revisions.

### 5. ACL before retrieval

Workspace/source/document ACL được áp dụng trước vector candidate generation, seed selection, graph traversal, voting, topic/context aggregation và summary generation.

## Canonical Domain Model

```text
Workspace
├── Source
│   └── Document
│       └── Revision (immutable)
│           ├── Section
│           └── Chunk (C)
│               ├── EntityObservation
│               └── AssertionEvidence
│
├── CanonicalEntity ── RelationshipProjection (G)
│          ╲              ╱
│           ChunkGraphMapping (M)
│
└── EnrichmentSnapshot
    ├── Topic hierarchy
    ├── Context catalog
    └── memberships to sources/chunks/entities/assertions
```

### Source, document and revision

- `source_id` identifies an external container/account/repository/channel.
- `document_id` identifies one logical item across updates.
- `revision_id` identifies immutable normalized content and ACL state.
- `source_external_id + source_revision/checksum` forms the connector idempotency boundary.
- Superseding or tombstoning a revision immediately removes it from all current retrieval views.

### Section and chunk

A chunk stores:

- stable `chunk_id` within a revision;
- normalized text and embedding;
- parent section and ordered heading path;
- source-specific location: page, line range, path, message timestamp or block ID;
- token count, content hash, parser/chunker/pipeline versions;
- current ACL projection needed before candidate retrieval.

Chunk IDs must derive from revision plus structural location/content identity, not list position alone.

### Entity observation

An observation records one entity mention in one evidence span:

- raw mention, normalized mention and proposed type;
- revision/chunk/span identity;
- extractor version and confidence;
- optional external identifiers and disambiguation attributes;
- link to a canonical entity plus resolver version/confidence.

Normalized name equality alone must never force a canonical merge.

### Assertion evidence

An assertion is a revision-scoped claim, not an aggregate graph edge.

```python
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AssertionPolarity(StrEnum):
    affirmed = "affirmed"
    negated = "negated"
    uncertain = "uncertain"


class AssertionEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assertion_id: UUID
    workspace_id: UUID
    revision_id: UUID
    chunk_id: str
    subject_observation_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    object_observation_id: UUID | None = None
    object_value: str | None = Field(default=None, max_length=4_000)
    polarity: AssertionPolarity
    confidence: float = Field(ge=0.0, le=1.0)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    extractor_version: str

    @model_validator(mode="after")
    def validate_object(self) -> "AssertionEvidence":
        if (self.object_observation_id is None) == (self.object_value is None):
            raise ValueError("exactly one assertion object is required")
        if self.evidence_end <= self.evidence_start:
            raise ValueError("evidence span must be ordered")
        return self
```

Qualifiers use a separately typed collection for source-specific fields such as role, environment or unit. Unbounded `dict[str, Any]` is not accepted at the service boundary.

### Canonical entity and relationship projection

- Canonical entities have stable IDs, aliases, types and resolver lineage.
- Relationship projections derive from canonicalized assertions.
- Multiple predicates/directions between the same pair remain distinct.
- Frequency, descriptions and source lists derive from active evidence; retries never increment them independently.
- A graph edge carries assertion IDs and chunk/revision provenance for every hop.

### Topic

A topic is a stable, versioned semantic cluster and may have multiple parents only if the read contract explicitly represents a DAG; MVP renders a primary parent tree plus secondary cross-links.

Topic memberships may target source, document, chunk, entity or assertion. Memberships include confidence, derivation method, first/last-seen snapshot and supporting evidence IDs.

Topics use lifecycle `candidate -> active -> stale | merged | archived`. Promotion and merge rules are versioned and tested; one chunk cannot immediately create an active topic.

### Context

A context is an auto-discovered, overlapping knowledge domain such as a project, product, team, customer, system or initiative.

It contains:

- stable identity, name, aliases and inferred context type;
- navigation summary, coverage and freshness;
- topic memberships and primary topic roots;
- representative sources/entities/assertions;
- confidence, stability score and discovery version.

Contexts use lifecycle `candidate -> active -> stale | merged | archived`. A source can belong to any number of contexts. Context membership never changes authorization or becomes graph isolation.

### Enrichment snapshot

Graph, topic and context outputs publish as immutable snapshots keyed by workspace, revision set, pipeline version and input checksum. Only a complete authorized snapshot becomes current. Older snapshots remain for audit according to retention policy but are not searched by default.

## TGS-RAG Conformance Contract

The TGS knowledge base must preserve:

```text
KB = (C, G, M)

C = current authorized text chunks
G = canonical entities and evidence-backed relationship projections
M = bidirectional chunk ↔ entity/relation/assertion mapping
```

### Required retrieval stages

1. Extract query targets and create query embedding.
2. Retrieve text candidates from `C` and seed entities from `G` independently.
3. Run semantic beam search to configured depth/width.
4. Store every explored candidate node and its best path in visited memory before pruning.
5. **Graph-to-Text:** all authorized visited entities, including pruned ones, vote for their source chunks; combine graph recommendation and semantic score.
6. **Text-to-Graph:** entities in initial text but absent from selected paths become orphan candidates; recover their stored paths from visited memory.
7. Re-score/deduplicate paths without discarding direction, predicate or provenance.
8. Consolidate bounded chunks and graph paths with hop-level citations.

### Non-conformant shortcuts

- Concatenating independent vector and graph results without mutual feedback.
- Voting only from final selected paths rather than all visited nodes.
- Re-querying the database and calling it orphan-memory recovery.
- Storing only aggregate source lists after losing revision/chunk evidence.
- Treating topic/context summaries as members of `C` without explicit derived-content labeling.

## Ingestion And Enrichment Pipeline

```text
Connector event
  -> normalize identity/checksum/ACL/tombstone
  -> create immutable revision + ingestion run
  -> parse source structure
  -> stage deterministic chunks + embeddings
  -> atomic base publish (SEARCHABLE)
  -> extract entity observations + assertions
  -> resolve canonical entities
  -> derive relationship projections + M
  -> publish TGS graph snapshot (GRAPH_READY)
  -> update topics from evidence windows
  -> update overlapping contexts from topic/source graph
  -> publish discovery snapshot (DISCOVERY_READY)
```

### Idempotency keys

- Connector: `workspace_id + source_id + external_id + source_revision/checksum`.
- Batch stage: `ingestion_run_id + stage_name + batch_id + pipeline_version`.
- Observation/assertion: deterministic evidence identity including revision, chunk and span.
- Snapshot: `workspace_id + input_revision_set_hash + pipeline_version`.

### Publish and failure semantics

- Temporal workflow payloads contain references and checksums, never whole documents/chunk collections/embeddings.
- External LLM/embedding calls finish before DB publish transactions.
- Base publish is DB-only and atomic.
- Graph/discovery failures leave base search available and surface readiness/freshness.
- Stale enrichment results whose input revision set is no longer current cannot publish.
- Delete/ACL revoke invalidates base and derived views before asynchronous cleanup.

## Context And Topic Discovery

Discovery is windowed and debounced, not performed as a side effect of each extraction prompt.

1. Build candidates from entity/assertion co-occurrence, source structure, embeddings and temporal signals.
2. Compare candidates with existing topics/contexts using aliases, centroid similarity, graph overlap and continuity.
3. Attach evidence-backed memberships many-to-many.
4. Promote candidates only after the versioned evidence threshold is satisfied.
5. Apply hysteresis so small input changes do not rename, split or merge active taxonomy unnecessarily.
6. Produce summaries only from current authorized supporting evidence.
7. Publish taxonomy changes with lineage: created, renamed, merged, split, stale or archived.

Quality measures include assignment precision/recall, taxonomy churn, identity survival across re-ingestion and cross-context edge retention.

## Change, Contradiction, And Gap Semantics

- **Change:** assertion/evidence differs between ordered revisions or validity intervals.
- **Contradiction:** active assertions about the same resolved subject/predicate have incompatible object, polarity or overlapping validity; the result returns both evidence sets and confidence.
- **Gap:** evidence required by an explicit query/template/expected relation is missing or stale. Absence in FLAE is never presented as proof that a fact is false.
- Summaries may describe detected results but cannot create them.

## Transport-Independent Read Capabilities

Names below describe service capabilities, not frozen MCP tool names.

| Capability | Purpose | Required output |
|---|---|---|
| Discover contexts | Inventory/search the knowledge map | context ID, type, summary, topic/source coverage, freshness, confidence |
| Get context | Orient within one context | topic roots, representative sources/entities, changes, risks, readiness |
| List topics | Browse the context “table of contents” | stable hierarchy/cross-links, counts, freshness, cursors |
| Search knowledge | Query text and TGS graph | ranked chunks, paths, match signals, citations, retrieval metadata |
| Explore graph | Expand entities/relationships with bounded hops | nodes, directed evidence-backed edges, paths, truncation state |
| Explain evidence | Verify assertion/path/context membership | hop-level assertions and source spans |
| Resolve source | Read an authorized resource/span | canonical URI, content, mime type, revision and location |
| Inspect memory state | Find changes, contradictions and gaps | typed findings, evidence on both sides, uncertainty/freshness |

All list/search capabilities use opaque workspace/subject/snapshot-bound cursors and explicit budgets. Adapters may expose a subset, but cannot weaken authorization or provenance.

## Resource Identity And Provenance

Canonical internal URIs remain transport-neutral:

```text
flae://workspace/{workspace_id}/documents/{document_id}/revisions/{revision_id}
flae://workspace/{workspace_id}/documents/{document_id}/revisions/{revision_id}/chunks/{chunk_id}
flae://workspace/{workspace_id}/assertions/{assertion_id}
flae://workspace/{workspace_id}/entities/{entity_id}
flae://workspace/{workspace_id}/topics/{topic_id}
flae://workspace/{workspace_id}/contexts/{context_id}
```

URIs contain no credentials/signed URLs and are not authorization grants. Every evidence-bearing result includes workspace/document/revision/chunk identity, source name/type, exact location when available, source modified time, ingestion time and content hash.

## Lifecycle And Readiness

Revision lifecycle:

```text
STAGING -> SEARCHABLE -> SUPERSEDED
    |           |
  FAILED     TOMBSTONED
```

Readiness is orthogonal:

```text
base:      pending | ready | failed
graph:     pending | ready | failed | stale
discovery: pending | ready | failed | stale
```

Base search requires `base=ready`. TGS mode requires a current `graph=ready` snapshot or returns a typed degraded/unavailable result. Context/topic navigation reports discovery readiness rather than silently serving stale data.

## Security And Tenant Isolation

- RAG application role is not table owner; RLS is `ENABLE` + `FORCE` with `USING` and `WITH CHECK`.
- Missing workspace DB context is default-deny.
- Repository methods require typed workspace/authorization context.
- ACL filters run before embeddings/search/traversal/voting/aggregation.
- Context/topic counts and summaries cannot reveal inaccessible sources.
- Cursors bind workspace, subject, ACL snapshot and query.
- Logs exclude raw source content, queries, credentials and assertion values by default.

## Error Contract

Stable domain codes include:

- `INVALID_ARGUMENT`
- `INVALID_CURSOR`
- `UNAUTHENTICATED`
- `PERMISSION_DENIED`
- `RESOURCE_NOT_FOUND`
- `REVISION_NOT_AVAILABLE`
- `GRAPH_NOT_READY`
- `DISCOVERY_NOT_READY`
- `SNAPSHOT_STALE`
- `RATE_LIMITED`
- `SERVICE_UNAVAILABLE`
- `INTERNAL_ERROR`

Errors contain safe message, request ID, retryability and optional typed details. They never include SQL, stack traces, hidden IDs, tokens or source contents.

## Project Structure

```text
docs/specs/agent_memory_contract.md       This source-of-truth specification.
tasks/plan.md                             Ordered implementation plan.
tasks/todo.md                             Session-sized implementation checklist.
backend/rag_migrations/                   Versioned rag_db schema changes.
backend/app/db/rag_models.py              Revision/evidence/graph/discovery models.
backend/app/schemas/agent_memory.py       Typed domain capability models.
backend/app/services/knowalge_base/       Ingestion, evidence, TGS and read services.
backend/app/agents/memory/                LangChain tools and LangGraph memory agent.
backend/app/temporal/                     Versioned ingestion/enrichment workflows.
backend/tests/evaluation/                 TGS and discovery benchmark fixtures.
```

Existing `knowalge_base` spelling is retained until a separate compatibility-safe package migration.

## Commands

```bash
uv run --project backend pytest backend/tests/evaluation -q
uv run --project backend pytest backend/tests/services -q
uv run --project backend pytest backend/tests/security -q
uv run --project backend pytest backend/tests/temporal -q
uv run --project backend pytest backend/tests/agents/test_memory_agent.py -q
uv run --project backend pytest --cov=app backend/tests/
uv run --project backend alembic -c backend/alembic-rag.ini upgrade head
```

## Code Style

- Endpoint -> Service -> Model; endpoints never execute SQL.
- Async I/O except explicitly isolated sync Temporal activities.
- Pydantic v2 at all workflow/service/adapter boundaries; no unbounded `Any`.
- Python names use `snake_case`; enums serialize lowercase at domain boundaries.
- Use `get_logger`; never `print()`.
- Every schema change uses reviewed Alembic migrations.

## Testing Strategy

### Contract and invariant tests

- Idempotent retries preserve row counts, evidence identity and snapshot checksums.
- Every graph hop and result citation resolves to an authorized current revision.
- Relationship direction/predicate survives extraction, resolution and projection.
- Delete/supersede/ACL races never expose stale evidence.
- Context/topic summaries are rejected as primary citations.

### TGS conformance benchmarks

The evaluation dataset contains deterministic supporting IDs and distractors for:

1. **Pseudo-evidence rejection:** “Incident của Customer Aurora bắt nguồn từ PR nào, implement ADR nào, và ai phê duyệt?”
2. **Orphan path recovery:** “Yêu cầu compliance của Helios tắt feature nào và qua dependency nào dẫn đến billing incident?”
3. **Semantic drift/entity ambiguity:** “Trong hai project Atlas, project nào dùng library của Minh, vì ADR nào chọn Vendor Nova, và security exception hết hạn khi nào?”

For each case, test full TGS and ablations without Graph-to-Text or Text-to-Graph. Report Strict Hit Rate, Recall, Precision, Support F1, path recovery, pseudo-evidence rejection, citation validity, latency and token cost.

### Discovery evaluation

- Context/topic assignment precision and recall on labeled fixtures.
- Many-to-many memberships and cross-context traversal.
- Stable IDs/names under reordered or repeated ingestion.
- Taxonomy churn after small updates.
- Freshness and stale snapshot behavior.

### Agent runtime evaluation

- LangGraph node/edge/tool-routing tests use deterministic model/tool doubles.
- Broad questions can orient through contexts/topics before targeted search; specific questions may take the direct retrieval path.
- Reasoning loops enforce step, hop, token and time budgets and return a typed incomplete result when exhausted.
- Local fixtures remain the reproducible source; configured environments mirror them to versioned LangSmith datasets and experiments.
- LangSmith traces correlate agent run, graph nodes, tool calls and retrieval query IDs after redaction.

### Security and performance

- Two-workspace/two-user ACL matrix across all capabilities.
- Zero inaccessible IDs/counts/summaries in results.
- Time-to-searchable, time-to-graph-ready and time-to-discovery-ready distributions.
- Query plans and representative tenant load tests.

## Boundaries

### Always

- Preserve immutable revision-scoped evidence and bidirectional `M` mappings.
- Require citations for factual chunks, assertions and graph hops.
- Apply authorization before candidate generation and aggregation.
- Version extractor, resolver, taxonomy and snapshot outputs.
- Keep contexts/topics rebuildable and many-to-many.
- Keep LangChain tools thin over canonical services and LangGraph state explicitly typed.

### Ask first

- Change canonical URI formats or permit historical revision reads.
- Auto-merge/split active contexts without reversible lineage.
- Change assertion ontology/predicate normalization rules.
- Add dependencies, connectors or public adapters.
- Make summary-derived content eligible as retrieval evidence.
- Export new content/PII fields to LangSmith or change trace sampling/redaction policy.

### Never

- Use aggregate frequency/source lists as irrecoverable source of truth.
- Merge entities solely by normalized name.
- Let context membership grant access or block otherwise valid graph traversal.
- Publish partial/stale enrichment snapshots.
- Treat missing evidence as proof that a fact is false.
- Put credentials, signed URLs or secret-bearing content in URIs/logs/workflow history.
- Let agents, LangChain tools or LangGraph nodes bypass capability services and query `rag_db` directly.

## Success Criteria

- Spec, plan and checklist agree that MCP is deferred and not a release dependency.
- Retry, publish, delete and ACL tests prove revision/evidence correctness.
- Current authorized `C`, `G` and `M` can be rebuilt from stored revisions/evidence.
- All three TGS scenarios retrieve every required supporting source with valid hop-level provenance and outperform both defined ablations on their target failure mode.
- Agents can discover contexts, browse topics, search knowledge, explore graph and resolve evidence through shared services without transport-specific types.
- A bounded LangGraph memory agent uses typed LangChain tools over those services, with redacted LangSmith traces/evaluations when configured.
- A source can belong to multiple contexts and relevant graph paths can cross contexts.
- Change/contradiction/gap findings return typed evidence and uncertainty.
- Graph/discovery failures do not prevent base text search; readiness is explicit.
- Cross-workspace and cross-ACL leakage count is zero.

## Open Questions For Later Gates

1. Chọn connector pilot nào để đại diện tốt nhất cho update/delete/ACL semantics: GitHub, Google Drive, Notion hay Slack?
2. Retention và hard-delete SLA cho raw content, superseded revisions và historical evidence là gì?
3. Threshold/SLO mục tiêu sẽ được freeze sau baseline cho time-to-searchable, graph-ready, discovery-ready, taxonomy churn và TGS latency.
4. Khi capability contracts ổn định, adapter nào cần làm trước: internal agent API, REST mở rộng hay MCP?
5. Historical revision reads có được phép khi caller chỉ định URI và có quyền audit hay không?
