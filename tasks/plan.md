# Implementation Plan: Evidence-First Company Memory and TGS Retrieval

## Overview

Mục tiêu là chuyển pipeline TGS-RAG prototype hiện tại thành Company Memory có thể tự khám phá contexts, tổ chức topics như mục lục, tìm kiếm text/graph, giải thích từng reasoning hop và truy ngược source evidence. Kế hoạch dùng kiến trúc **Evidence-first + Dual-speed**: base chunks được publish nhanh; graph, topics và contexts được enrich bất đồng bộ từ immutable revision-scoped evidence.

MCP không thuộc critical path. Các capability services được thiết kế độc lập với transport; REST, MCP hoặc internal agents chỉ được thêm làm adapters sau khi knowledge model, retrieval quality và authorization boundary ổn định.

Spec nguồn sự thật: `docs/specs/agent_memory_contract.md`.

## Success Criteria

- Retry/replay không tạo duplicate chunks, observations, assertions, memberships hoặc aggregate frequency.
- Chunks của current revision trở thành searchable qua atomic publish trước graph/discovery enrichment.
- Mọi canonical entity, relationship edge, graph hop, topic/context membership và finding đều truy ngược được immutable source evidence.
- TGS retrieval thực hiện đúng visited memory, Graph-to-Text voting và Text-to-Graph orphan bridging.
- Ba benchmark Aurora, Helios và Atlas đạt supporting-document coverage/citation gates và chứng minh lợi ích của từng TGS mechanism so với ablations.
- FLAE tự tạo/cập nhật overlapping contexts; một source có thể thuộc nhiều contexts và traversal có thể đi xuyên context.
- Topics/contexts có stable identity, lineage và bounded taxonomy churn sau re-ingestion/update.
- Agents có thể discover contexts, browse topics, search, explore graph, explain evidence, resolve source và inspect changes/contradictions/gaps qua transport-independent services.
- Internal memory agents dùng typed LangChain tools và bounded LangGraph reasoning; LangSmith cung cấp redacted traces, datasets và experiment regressions mà không nằm trên correctness path.
- Base search vẫn hoạt động khi graph/topic/context enrichment fail; readiness/freshness không bị che giấu.
- Không có cross-workspace hoặc cross-source-ACL IDs, counts, summaries hay results trong test suite.

## Non-Goals

- Không implement MCP server, MCP tool schemas, remote MCP OAuth hoặc mutating agent tools trong plan này.
- Không dùng global community summaries làm retrieval source of truth.
- Không ingest tất cả connectors cùng lúc; chỉ làm một delta-sync pilot sau core release gates.
- Không xây ontology hoàn chỉnh hoặc causal inference không có source evidence.
- Không dùng topic/context summary làm citation.
- Không retire Workflow V1 hoặc legacy REST fields trước compatibility/replay gates.

## Architecture Decisions

### 1. Immutable revisions and evidence

Source update tạo immutable revision. Entity mentions và assertions được lưu theo revision/chunk/span. Canonical graph, frequencies, descriptions, topics, contexts và findings là derived projections có thể rebuild.

### 2. TGS knowledge base is `KB=(C,G,M)`

- `C`: current authorized chunks.
- `G`: canonical entities và evidence-backed directed relationships.
- `M`: bidirectional mappings giữa chunks và entities/relationships/assertions.

Không coi việc concatenate vector hits và graph paths là TGS conformance.

### 3. Base publish before enrichment

Revision lifecycle chỉ kiểm soát base visibility:

```text
STAGING -> SEARCHABLE -> SUPERSEDED
    |           |
  FAILED     TOMBSTONED
```

Readiness của `base`, `graph`, `discovery` được theo dõi riêng. Graph/discovery failure không hạ base search.

### 4. Assertions preserve meaning

Relationship identity giữ direction và predicate; nhiều predicates giữa cùng hai entities không bị collapse. Assertion lưu polarity, confidence, temporal validity và exact evidence span để hỗ trợ contradiction/change detection.

### 5. Entity resolution is explicit

Extraction tạo entity observations trước. Resolver mới map observations sang canonical entities bằng evidence và versioned rules; normalized name equality không tự động merge.

### 6. Topics and contexts are derived overlapping views

Topic/context discovery chạy windowed/debounced sau graph enrichment, không nằm chung LLM prompt extraction per chunk. Membership many-to-many và không grant/revoke access hay partition graph traversal.

### 7. Summaries are navigation metadata

Topic/context summaries chỉ tổng hợp current authorized evidence. Factual results và reasoning paths luôn cite chunk/assertion sources.

### 8. Capability services precede adapters

Domain services cung cấp discovery, search, graph exploration, evidence explanation, resource resolution và memory-state inspection. Adapter tương lai không được duplicate business logic hoặc hạ authorization/provenance guarantees.

### 9. Authorization before candidate generation

RLS, workspace context và source/document ACL áp dụng trước vector lookup, graph seed/traversal, visited-node voting, orphan bridging và discovery aggregation.

### 10. Temporal passes references only

Workflow inputs là typed models chứa IDs, references, checksums và pipeline versions. Raw documents, full chunk arrays và embeddings nằm trong GCS/RAG staging, không nằm trong workflow history.

### 11. Agent runtime uses LangChain, LangGraph and LangSmith

LangChain định nghĩa typed read-only tools trên canonical capability services. LangGraph điều phối bounded online reasoning, tool routing và persisted agent state trong `flae_agent_state_db`; nó không thay Temporal cho durable ingestion. LangSmith lưu redacted traces, versioned evaluation datasets và experiment results, nhưng không nằm trên correctness path hoặc trở thành memory source of truth.

## Target Data Flow

```text
Connector event
      |
      v
Source identity + revision + ACL + checksum
      |
      v
Structure-aware parse -> deterministic chunks -> base staging
      |
      v
Atomic base publish ------------------------------> Base search
      |
      v
Entity observations + assertions
      |
      v
Entity resolution -> relationship projection -> C-G-M snapshot
      |
      +---------------------------> TGS retrieval
      |
      v
Topic discovery -> context discovery -> discovery snapshot
      |
      +---------------------------> Context catalog / topic TOC
      |
      v
Change / contradiction / gap projections
```

## Dependency Graph

```text
Spec + benchmark fixtures
          |
          v
rag_db migrations
          |
          +--> revisions/runs/staging --> provenance chunks
          |                                  |
          +--> evidence schema ---------------+
          |                                  |
          v                                  v
     RLS repositories                idempotent base staging
                                             |
                                             v
                                    atomic base publish
                                             |
                                             v
                                   Workflow V2 + worker
                                             |
                                             v
                                    evidence extraction
                                             |
                                             v
                        entity resolution -> C-G-M projection
                                             |
                                             v
                                      graph snapshot
                                             |
                  +--------------------------+------------------+
                  v                                             v
          TGS retrieval                                  topic discovery
                  |                                             |
                  v                                             v
      evidence-backed capabilities                       context discovery
                  |                                             |
                  v                                             |
         LangGraph memory agent                                 |
                  |                                             |
                  +--------------------------+------------------+
                                             v
                              discovery + memory-state capabilities
                                             |
                                             v
                               observability -> connector pilot -> rollout
```

## Task List

### Phase 1: Contract and measurable baselines

## Task 1: Freeze the Company Memory domain contract

**Description:** Review and implement the canonical models in the approved spec: revisions/readiness, provenance, observations, assertions, contexts, topics, paths, findings and typed errors. These models are transport-independent.

**Acceptance criteria:**
- [x] Pydantic models match all normative spec constraints without unbounded `Any` at service boundaries.
- [x] Context/topic summaries are explicitly marked derived and cannot satisfy evidence/citation models.
- [x] Existing REST schemas remain compatible through additive adapters only.

**Verification:**
- [x] `uv run --project backend pytest backend/tests/schemas/test_agent_memory_contract.py -q`
- [x] JSON serialization examples and invalid-boundary cases from the spec pass.

**Dependencies:** None.

**Files likely touched:**
- `docs/specs/agent_memory_contract.md`
- `backend/app/schemas/agent_memory.py`
- `backend/app/schemas/sche_knowledge_base.py`
- `backend/tests/schemas/test_agent_memory_contract.py`

**Estimated scope:** Medium.

## Task 2: Establish TGS and discovery evaluation fixtures

**Description:** Tạo offline dataset cho ba company-memory scenarios Aurora, Helios và Atlas, kèm exact supporting chunks/paths, distractors, ACL negatives và labeled context/topic memberships.

**Acceptance criteria:**
- [x] Mỗi query có expected sources, entity path, assertion evidence và distractor rationale.
- [x] Suite đo Strict Hit Rate, Recall, Precision, Support F1, path recovery, pseudo-evidence rejection, citation validity, ACL leakage và latency.
- [x] Discovery fixtures đo many-to-many assignment, stable identity và taxonomy churn; configured environments mirror fixtures into a versioned LangSmith dataset.

**Verification:**
- [x] `uv run --project backend pytest backend/tests/evaluation -q`
- [x] Baseline chạy offline; khi LangSmith được cấu hình, cùng examples chạy thành named experiments cho current retriever và hai TGS ablations.

**Dependencies:** Task 1.

**Files likely touched:**
- `backend/tests/evaluation/dataset.json`
- `backend/tests/evaluation/metrics.py`
- `backend/tests/evaluation/test_tgs_retrieval.py`
- `backend/tests/evaluation/test_discovery_quality.py`
- `docs/retriever-evaluation-plan.md`

**Estimated scope:** Medium.

### Checkpoint A: Contract and baselines

- [x] Human review xác nhận domain model, assumptions và non-goals.
- [x] Baselines chạy repeatably và không gọi production services.
- [x] Benchmark fixtures chứng minh đúng failure mode của từng TGS mechanism.

### Phase 2: Revisioned storage and security foundation

## Task 3: Add a dedicated Alembic track for `rag_db`

**Description:** Thay runtime DDL drift bằng versioned migrations dùng `RAG_DATABASE_URL`, với clean install và upgrade smoke tests tách khỏi `flae_db`.

**Acceptance criteria:**
- [x] Alembic config/env không thể chạy nhầm vào core database.
- [x] Empty database upgrade tạo equivalent current schema trước schema mới.
- [x] CI smoke test upgrade base-to-head trên disposable PostgreSQL.

**Verification:**
- [x] `uv run --project backend alembic -c backend/alembic-rag.ini upgrade head`
- [x] Migration smoke tests pass.

**Dependencies:** Task 1.

**Files likely touched:**
- `backend/alembic-rag.ini`
- `backend/rag_migrations/env.py`
- `backend/rag_migrations/versions/*_baseline_rag_schema.py`
- `backend/tests/migrations/test_rag_migrations.py`

**Estimated scope:** Medium.

## Task 4: Add revisions, ingestion runs and stage manifests

**Description:** Thêm immutable document revisions, ingestion runs, stage/batch manifests, checksums và facet readiness. Backfill current data into synthetic revisions.

**Acceptance criteria:**
- [x] Unique keys chặn duplicate run/stage/batch writes.
- [x] Revision state và base/graph/discovery readiness tuân theo spec.
- [x] Backfill giữ current visibility và có reviewed recovery strategy.

**Verification:**
- [x] Clean-install and upgrade fixture tests pass.
- [x] Duplicate manifest writes produce identical counts/checksums.

**Dependencies:** Task 3.

**Files likely touched:**
- `backend/rag_migrations/versions/*_add_revisions_and_runs.py`
- `backend/app/db/rag_models.py`
- `backend/tests/migrations/test_revision_schema.py`
- `docs/data/ingestion_revision_schema.md`

**Estimated scope:** Medium.

## Task 5: Add structure-aware chunks and canonical resources

**Description:** Mở rộng chunks với revision, section hierarchy, exact source location, ACL projection, versions, content hash và stable FLAE resource identity.

**Acceptance criteria:**
- [x] Chunk IDs ổn định cho cùng normalized revision/location và không chỉ dựa vào array position.
- [x] Page/code/message/section locations round-trip qua typed models và canonical URI parser.
- [x] Superseded/tombstoned resources không xuất hiện trong current read view.

**Verification:**
- [x] URI/location schema and migration tests pass.
- [x] Re-chunking fixtures prove deterministic IDs for unchanged structural spans.

**Dependencies:** Task 4.

**Files likely touched:**
- `backend/rag_migrations/versions/*_add_chunk_provenance.py`
- `backend/app/db/rag_models.py`
- `backend/app/services/knowalge_base/resource_service.py`
- `backend/tests/services/test_memory_resources.py`

**Estimated scope:** Medium.

## Task 6: Add entity observations and assertion evidence

**Description:** Lưu raw entity mentions, typed assertions, qualifiers, polarity, confidence, validity intervals, spans và extractor lineage theo revision/chunk.

**Acceptance criteria:**
- [x] Exactly-one object constraint và ordered evidence spans được enforce.
- [x] Multiple directed predicates between the same entity pair remain distinct.
- [x] Identical retry writes update/no-op by deterministic evidence identity.

**Verification:**
- [x] Migration and model constraint tests pass.
- [x] Fixtures cover negation, uncertainty, literal objects and temporal validity.

**Dependencies:** Tasks 4-5.

**Files likely touched:**
- `backend/rag_migrations/versions/*_add_evidence_schema.py`
- `backend/app/db/rag_models.py`
- `backend/app/schemas/agent_memory.py`
- `backend/tests/models/test_assertion_evidence.py`

**Estimated scope:** Medium.

## Task 7: Harden tenant and ACL-scoped repositories

**Description:** Dùng non-owner role, `FORCE ROW LEVEL SECURITY`, `USING`/`WITH CHECK` và repositories luôn nhận typed workspace/authorization context.

**Acceptance criteria:**
- [x] Missing workspace context default-deny cho mọi base/evidence/discovery table.
- [x] Repository không expose unscoped list/load/traverse method.
- [x] Source/document ACL filters tồn tại trước vector/graph candidate APIs.

**Verification:**
- [x] Two-workspace/two-role RLS integration tests pass.
- [x] Security suite reports zero leaked rows/IDs/counts.

**Dependencies:** Tasks 4-6.

**Files likely touched:**
- `backend/rag_migrations/versions/*_force_rag_rls.py`
- `backend/app/db/rag_db.py`
- `backend/app/db/rag_repository.py`
- `backend/tests/security/test_rag_rls.py`

**Estimated scope:** Medium.

### Checkpoint B: Storage correctness and isolation

- [x] Clean upgrade/backfill/recovery tests pass.
- [x] Duplicate evidence writes are idempotent.
- [x] Current v1 reads remain compatible with synthetic revisions.
- [x] Cross-tenant and cross-ACL leakage is zero.

### Phase 3: Dual-speed base ingestion

## Task 8: Implement deterministic base staging

**Description:** Parse source structure, chunk, embed và UPSERT staged outputs theo run/stage/batch/version; activities return only small summaries and references.

**Acceptance criteria:**
- [x] Same revision/pipeline input produces identical chunks, manifests and checksums.
- [x] Long work heartbeats progress and cancellation stops safely.
- [x] External retries are bounded so Temporal remains retry owner.

**Verification:**
- [x] Activity tests run each batch twice and compare row/checksum identity.
- [x] Failure injection after parse/embed does not duplicate stage data.

**Dependencies:** Tasks 5 and 7.

**Files likely touched:**
- `backend/app/temporal/activities/ingestion_v2.py`
- `backend/app/services/knowalge_base/staging_service.py`
- `backend/app/services/knowalge_base/chunking_service.py`
- `backend/tests/temporal/test_base_staging.py`

**Estimated scope:** Medium.

## Task 9: Implement atomic base publish and resource reads

**Description:** Publish a complete staged revision in one DB-only transaction, supersede old revision and expose current authorized resource/span reads.

**Acceptance criteria:**
- [x] Missing batch/checksum mismatch cannot become `SEARCHABLE`.
- [x] Retry after commit returns the same published result; retry before commit preserves old current revision.
- [x] Delete/ACL revoke immediately removes base and resource visibility.

**Verification:**
- [x] Transaction failure injection at each write boundary passes.
- [x] Resource round-trip and supersede/delete race tests pass.

**Dependencies:** Task 8.

**Files likely touched:**
- `backend/app/services/knowalge_base/publish_service.py`
- `backend/app/services/knowalge_base/resource_service.py`
- `backend/app/temporal/activities/ingestion_v2.py`
- `backend/tests/services/test_atomic_base_publish.py`
- `backend/tests/services/test_memory_resources.py`

**Estimated scope:** Medium.

## Task 10: Add typed Workflow V2 and isolated capacity

**Description:** Tạo new workflow type với references-only Pydantic input, bounded fan-out, dedicated task queue/worker và configurable per-workspace capacity.

**Acceptance criteria:**
- [x] Workflow history contains no raw document, full chunks or embeddings.
- [x] V1 histories replay/complete unchanged; new starts use V2 behind feature flag.
- [x] Ingestion backlog does not starve interactive workers in load tests.

**Verification:**
- [x] WorkflowEnvironment tests cover happy/transient/permanent/cancel paths.
- [x] V1 and V2 replayer fixtures pass.

**Dependencies:** Tasks 8-9.

**Files likely touched:**
- `backend/app/temporal/workflows/ingestion_v2.py`
- `backend/workers/flae_ingestion_worker.py`
- `backend/app/core/config.py`
- `backend/tests/temporal/test_ingestion_v2_workflow.py`
- `backend/tests/temporal/test_ingestion_worker_capacity.py`

**Estimated scope:** Medium.

### Checkpoint C: Base search rollout

- [ ] V2 shadow/canary proves replay safety and bounded workflow payloads.
- [ ] Time-to-searchable and retry cost meet baseline gate.
- [ ] Forced graph/discovery failure leaves base search and resource reads available.

### Phase 4: Evidence extraction and TGS graph

## Task 11: Extract revision-scoped observations and assertions

**Description:** Tách entity/assertion extraction khỏi topic classification. Persist raw structured extraction before any fusion/resolution and retain exact evidence spans.

**Acceptance criteria:**
- [x] Extraction output contains no topic/context assignment side effects.
- [x] Every observation/assertion resolves to current staged revision/chunk/span.
- [x] Retrying extraction is deterministic/idempotent for the same extractor version.

**Verification:**
- [x] Parser tests cover malformed output, duplicate mention and directed predicates.
- [x] Retry/failure tests prove no aggregate mutation before evidence publish.

**Dependencies:** Tasks 6 and 10.

**Files likely touched:**
- `backend/app/agents/extractor/prompts.py`
- `backend/app/agents/extractor/nodes.py`
- `backend/app/services/knowalge_base/evidence_service.py`
- `backend/app/temporal/activities/enrichment.py`
- `backend/tests/services/test_evidence_extraction.py`

**Estimated scope:** Medium.

## Task 12: Implement versioned entity resolution

**Description:** Resolve observations using external IDs, aliases, types, attributes, graph neighborhood and source context; retain merge/split lineage and confidence.

**Acceptance criteria:**
- [x] Same-name entities in Atlas fixtures remain distinct unless evidence supports merge.
- [x] Resolver results are versioned, replayable and reversible through lineage.
- [x] Low-confidence matches remain unresolved instead of forced merge.

**Verification:**
- [x] Unit fixtures cover aliases, collisions, cross-language names and split/merge.
- [x] Re-running resolver on unchanged evidence yields identical mapping checksum.

**Dependencies:** Task 11.

**Files likely touched:**
- `backend/app/services/knowalge_base/entity_resolution_service.py`
- `backend/app/db/rag_repository.py`
- `backend/app/schemas/agent_memory.py`
- `backend/tests/services/test_entity_resolution.py`

**Estimated scope:** Medium.

## Task 13: Derive relationship projections and bidirectional `M`

**Description:** Project canonical entities/relationships from active assertions and build chunk↔entity/relation/assertion mappings required by TGS.

**Acceptance criteria:**
- [x] Direction, predicate, polarity and per-hop evidence survive projection.
- [x] Aggregate descriptions/frequency/source lists derive from evidence and do not inflate on retry.
- [x] Both directions of `M` return identical authorized provenance sets.

**Verification:**
- [x] Projection rebuild twice yields identical row/checksum output.
- [x] Mapping round-trip and deletion/supersede tests pass.

**Dependencies:** Task 12.

**Files likely touched:**
- `backend/app/services/knowalge_base/graph_projection_service.py`
- `backend/app/services/knowalge_base/fusion_service_v2.py`
- `backend/app/db/rag_repository.py`
- `backend/tests/services/test_graph_projection.py`

**Estimated scope:** Medium.

## Task 14: Publish versioned graph snapshots

**Description:** Stage a complete C-G-M projection and atomically switch current graph readiness only if its revision-set checksum is still current.

**Acceptance criteria:**
- [x] Partial or stale graph runs cannot publish.
- [x] Supersede/delete/ACL change invalidates old graph visibility before cleanup.
- [x] Graph failure sets explicit readiness without changing base visibility.

**Verification:**
- [x] Snapshot race/failure-injection tests pass.
- [x] Historical snapshot remains auditable but absent from default retrieval.

**Dependencies:** Task 13.

**Files likely touched:**
- `backend/app/services/knowalge_base/graph_snapshot_service.py`
- `backend/app/temporal/workflows/enrichment.py`
- `backend/app/temporal/activities/enrichment.py`
- `backend/tests/services/test_graph_snapshot_publish.py`

**Estimated scope:** Medium.

### Checkpoint D: Rebuildable evidence-backed graph

- [x] Current C-G-M rebuild matches published snapshot checksum.
- [x] Every graph edge/hop resolves assertion and source citations.
- [x] Graph snapshot races never surface stale or unauthorized evidence.
- [x] Topic/context code is no longer coupled to extraction.

### Phase 5: Faithful TGS retrieval and agent read capabilities

## Task 15: Make TGS retrieval conformant

**Description:** Refactor current retriever so visited memory stores all explored candidates before pruning, Graph-to-Text voting uses selected+pruned authorized nodes, and Text-to-Graph recovers orphan paths from memory.

**Acceptance criteria:**
- [x] Graph-to-Text and Text-to-Graph can be toggled independently for ablation tests.
- [x] Orphan recovery does not issue a graph re-expansion query.
- [x] ACL filtering precedes seeds, traversal, voting and bridging.

**Verification:**
- [x] Focused semantic beam, voting and orphan-memory unit tests pass.
- [x] Aurora and Helios target metrics improve over their relevant ablations.

**Dependencies:** Tasks 2 and 14.

**Files likely touched:**
- `backend/app/services/knowalge_base/retriever_service.py`
- `backend/app/services/knowalge_base/retriever_helpers.py`
- `backend/app/services/knowalge_base/tgs_models.py`
- `backend/tests/services/test_tgs_retriever.py`
- `backend/tests/evaluation/test_tgs_retrieval.py`

**Estimated scope:** Medium.

## Task 16: Add evidence-backed search and graph exploration results

**Description:** Return bounded text hits, directed graph paths, match signals, readiness, hop-level citations and explicit truncation; add source/evidence resolution services without adapter-specific types.

**Acceptance criteria:**
- [x] Every hit/path hop has resolvable current authorized evidence.
- [x] Context/token/hop budgets are deterministic and never silently truncate citations.
- [x] Existing REST response remains available through an additive compatibility mapper.

**Verification:**
- [x] Provenance, budgeting and compatibility tests pass.
- [x] Atlas ambiguity benchmark returns the correct entity chain and sources.

**Dependencies:** Task 15.

**Files likely touched:**
- `backend/app/services/knowalge_base/knowledge_query_service.py`
- `backend/app/services/knowalge_base/resource_service.py`
- `backend/app/schemas/agent_memory.py`
- `backend/app/schemas/sche_knowledge_base.py`
- `backend/tests/services/test_knowledge_query_service.py`

**Estimated scope:** Medium.

## Task 17: Build the LangGraph Company Memory agent runtime

**Description:** Expose available canonical read capabilities as typed LangChain tools and compose a bounded LangGraph agent that can search, explore graph, verify evidence and return cited results. Context/topic tools are attached after Task 20 publishes discovery capabilities. Persist resumable agent state in `flae_agent_state_db` when configured and emit redacted LangSmith traces/evaluations.

**Acceptance criteria:**
- [x] LangChain tools call capability services only; tools/nodes never query `rag_db` directly or weaken ACL/provenance contracts.
- [x] LangGraph state, routing, step/hop/token/time budgets and incomplete/error outcomes are explicitly typed and deterministic under model/tool doubles.
- [x] LangSmith tracing is optional, redacted and failure-isolated; disabling or losing LangSmith does not change agent correctness.

**Verification:**
- [x] `uv run --project backend pytest backend/tests/agents/test_memory_agent.py -q`
- [x] Aurora, Helios and Atlas agent runs return expected evidence chains and versioned LangSmith experiments when configured.

**Dependencies:** Task 16.

**Files likely touched:**
- `backend/app/agents/memory/state.py`
- `backend/app/agents/memory/tools.py`
- `backend/app/agents/memory/graph.py`
- `backend/app/core/langsmith.py`
- `backend/tests/agents/test_memory_agent.py`

**Estimated scope:** Medium.

### Checkpoint E: TGS quality gate

- [x] Full TGS beats target ablations on all three designed failure modes.
- [x] Supporting sources and hop citations meet frozen coverage/validity thresholds.
- [x] ACL leakage is zero and graph mode can degrade cleanly to base search.
- [ ] Latency/token cost stays within threshold established from Task 2.
- [x] LangGraph agent respects budgets, preserves citations and remains correct when LangSmith is unavailable.

### Phase 6: Topics and overlapping context discovery

## Task 18: Implement versioned topic discovery

**Description:** Cluster evidence windows into topic candidates, resolve against existing taxonomy, apply promotion/hysteresis rules and publish membership lineage separately from extraction.

**Acceptance criteria:**
- [x] One chunk cannot immediately create an active topic.
- [x] Repeated/reordered ingestion preserves topic identity within benchmark threshold.
- [x] Topic memberships are many-to-many, evidence-backed and revision-aware.

**Verification:**
- [x] Topic assignment, promotion, merge/split and taxonomy-churn tests pass.
- [x] Existing topic UI/API compatibility is documented and tested.

**Dependencies:** Tasks 13-14.

**Files likely touched:**
- `backend/app/services/topic_discovery_service.py`
- `backend/app/services/srv_topic.py`
- `backend/app/temporal/workflows/topic.py`
- `backend/tests/services/test_topic_discovery.py`
- `docs/features/topics/SPEC.md`

**Estimated scope:** Medium.

## Task 19: Implement overlapping context discovery

**Description:** Cluster topic/source/entity/assertion signals into stable contexts with aliases, inferred type, confidence, stability and versioned many-to-many memberships.

**Acceptance criteria:**
- [x] Same source can belong to multiple contexts without duplicate source/evidence rows.
- [x] Small evidence updates do not cause unbounded rename/split/merge churn.
- [x] Cross-context graph edges remain traversable and are not copied into isolated graphs.

**Verification:**
- [x] Discovery fixtures test projects, products, teams/customers and overlapping memberships.
- [x] Re-ingestion and incremental update stability metrics meet frozen threshold.

**Dependencies:** Task 18.

**Files likely touched:**
- `backend/app/services/context_discovery_service.py`
- `backend/app/schemas/agent_memory.py`
- `backend/app/temporal/workflows/context_discovery.py`
- `backend/tests/services/test_context_discovery.py`

**Estimated scope:** Medium.

## Task 20: Publish discovery snapshots and catalog capabilities

**Description:** Atomically publish authorized topic/context snapshots and expose context inventory/detail plus topic table-of-contents capabilities with freshness, coverage and opaque cursors.

**Acceptance criteria:**
- [x] Partial/stale discovery runs never replace current snapshot.
- [x] Context/topic summaries include lineage and are never returned as factual citations.
- [x] Counts/summaries exclude inaccessible sources before aggregation.

**Verification:**
- [x] Snapshot race, pagination and ACL aggregation tests pass.
- [x] Agent can navigate workspace -> context -> topics -> evidence in fixture flow.

**Dependencies:** Tasks 18-19.

**Files likely touched:**
- `backend/app/services/discovery_snapshot_service.py`
- `backend/app/services/knowledge_catalog_service.py`
- `backend/app/schemas/agent_memory.py`
- `backend/tests/services/test_knowledge_catalog_service.py`

**Estimated scope:** Medium.

## Task 21: Add change, contradiction and gap projections

**Description:** Compare assertion sets across revisions/validity intervals, surface incompatible active evidence and report query/template-defined missing or stale evidence with uncertainty.

**Acceptance criteria:**
- [x] Change findings identify before/after evidence and revision ordering.
- [x] Contradictions return both evidence sets; summaries alone cannot create a finding.
- [x] Gaps state the expected evidence rule and never infer falsehood from absence.

**Verification:**
- [x] Temporal overlap, negation, object conflict and stale-gap fixtures pass.
- [x] Delete/supersede updates findings idempotently.

**Dependencies:** Tasks 16 and 20.

**Files likely touched:**
- `backend/app/services/memory_state_service.py`
- `backend/app/schemas/agent_memory.py`
- `backend/app/temporal/workflows/memory_state.py`
- `backend/tests/services/test_memory_state_service.py`

**Estimated scope:** Medium.

### Checkpoint F: Discoverable Company Memory

- [ ] Agents can discover contexts and browse topic TOCs without prior IDs.
- [ ] Overlapping context memberships and cross-context paths work end-to-end.
- [ ] Topic/context identity and churn meet evaluation gates.
- [ ] Change/contradiction/gap findings resolve to current evidence.
- [ ] Discovery failure does not disable base/TGS retrieval.

### Phase 7: Operations, continuous sync and rollout

## Task 22: Add agent, ingestion, TGS and discovery observability

**Description:** Instrument queue lag, stage latency/retries, payload sizes, token usage, readiness times, TGS mechanisms, taxonomy churn, snapshot failures and authorization anomalies. Correlate Temporal/retrieval IDs with redacted LangGraph node/tool spans and LangSmith traces/experiments.

**Acceptance criteria:**
- [ ] Metrics distinguish base, graph, retrieval, topic, context and memory-state bottlenecks.
- [ ] Alerts cover stuck runs, freshness breaches, stale publish attempts and ACL anomalies.
- [ ] Logs/LangSmith traces carry correlation IDs but exclude raw content, queries, evidence values, PII and secrets by default.

**Verification:**
- [ ] Metrics/tracing and log-redaction tests pass.
- [ ] SLO/rollback runbook contains thresholds from evaluation/load evidence.

**Dependencies:** Tasks 10, 15, 17 and 20-21.

**Files likely touched:**
- `backend/app/core/observability.py`
- `backend/app/core/temporal.py`
- `backend/app/core/langsmith.py`
- `backend/tests/observability/test_memory_metrics.py`
- `docs/operations/company_memory_slos.md`

**Estimated scope:** Medium.

## Task 23: Define connector delta-sync and implement one pilot

**Description:** Chuẩn hóa connector event gồm external identity, source revision/checksum, modified time, ACL, cursor và tombstone; implement one representative connector end-to-end.

**Acceptance criteria:**
- [ ] Unchanged content skips parse/embed/extract.
- [ ] Update creates revision; delete/permission change removes inaccessible base and derived results promptly.
- [ ] Cursor restart is idempotent without misses/duplicates.

**Verification:**
- [ ] Connector update/delete/ACL replay tests pass.
- [ ] Pilot completes sync -> base -> graph -> contexts -> TGS query -> evidence read.

**Dependencies:** Tasks 21-22 and a connector decision gate.

**Files likely touched:**
- `backend/app/connectors/base.py`
- `backend/app/connectors/<pilot>/adapter.py`
- `backend/app/services/source_sync_service.py`
- `backend/tests/connectors/test_pilot_delta_sync.py`
- `docs/connectors/delta_sync_contract.md`

**Estimated scope:** Medium.

## Task 24: Roll out V2 and retire legacy paths safely

**Description:** Canary V2, verify no open V1 histories/legacy-only data, archive replay fixtures and retire runtime DDL/legacy fusion only after compatibility telemetry and rollback drill.

**Acceptance criteria:**
- [ ] V1 remains registered until Temporal visibility confirms no open histories.
- [ ] All active data has revision/provenance/evidence or documented compatibility fallback.
- [ ] No consumer relies on deprecated fields according to telemetry before removal.

**Verification:**
- [ ] Production readiness checklist, replay suite and rollback drill pass.
- [ ] Full backend/evaluation/security suites pass after staged retirement.

**Dependencies:** Tasks 22-23.

**Files likely touched:**
- `backend/workers/flae_ingestion_worker.py`
- `backend/app/temporal/workflows/ingestion.py`
- `backend/app/services/knowalge_base/fusion_service.py`
- `docs/operations/ingestion_v1_retirement.md`

**Estimated scope:** Medium.

### Checkpoint G: Production-ready memory core

- [ ] Connector pilot meets freshness, deletion and ACL SLOs.
- [ ] Company Memory capabilities pass quality/security/load gates.
- [ ] V1 rollback remains available through the agreed observation window.
- [ ] Only after this checkpoint may a separate plan freeze REST/MCP adapter contracts.

## Verification Matrix

| Layer | Required verification |
|---|---|
| Schema | clean upgrade, existing-data backfill, constraints, RLS, recovery |
| Base ingestion | deterministic chunks, retries, heartbeat, cancellation, atomic publish |
| Evidence | span identity, direction/predicate, negation/time, idempotent rebuild |
| Entity resolution | collisions, aliases, confidence, reversible merge/split lineage |
| C-G-M | bidirectional mapping, graph snapshot atomicity, deletion/ACL invalidation |
| TGS | visited memory, global voting, orphan recovery, ablations, path citations |
| Discovery | many-to-many contexts, topic hierarchy, identity stability, taxonomy churn |
| Memory state | revision diffs, temporal contradiction, evidence-defined gaps |
| Security | pre-candidate ACL, RLS, cursor binding, no count/summary leakage |
| Performance | searchable/graph/discovery readiness, p50/p95, token cost, queue lag |

## Definition Of Done For Every Task

- New behavior and failure-path tests exist and focused tests pass.
- Affected backend suite passes via `uv run --project backend pytest`.
- Public/workflow/service boundaries use explicit Pydantic types.
- Database changes have reviewed Alembic migration and recovery notes.
- Workspace/ACL constraints and log redaction are tested.
- Documentation/config examples change with behavior.
- No legacy workflow/API behavior is removed without compatibility and rollout gates.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| Same-name entity fusion corrupts paths | High | Observation-first resolver, confidence, collision fixtures, reversible lineage |
| Aggregate relation loses direction/predicate | High | Assertion schema and distinct evidence-backed projections |
| Retry inflates evidence/topic counts | High | Deterministic identities, replace/UPSERT, checksum rebuild tests |
| Old enrichment publishes after new revision | High | Revision-set checksums and compare-before-publish transaction |
| Context discovery fragments or churns | High | Candidate lifecycle, hysteresis, lineage, benchmarked thresholds |
| Context becomes accidental ACL boundary | High | Authorization independent of membership; pre-aggregation ACL tests |
| Summary contaminates factual retrieval | High | Derived-content labeling and citation model rejection |
| Graph pruning loses critical bridge | High | Faithful visited memory and orphan recovery ablation tests |
| Graph voting recalls inaccessible chunks | High | ACL-filtered C/G/M inputs before voting |
| TGS query latency/cost grows | Medium | Bounded beam/hops/candidates, index plans, SLOs and base-mode fallback |
| Workflow V2 breaks in-flight histories | High | New workflow type, retained V1 worker, replay tests, feature flag |
| Connector delete/ACL lag leaks stale memory | High | Synchronous visibility invalidation before async cleanup |

## Explicit Decision Gates

1. **After Task 2:** freeze quality/latency/taxonomy thresholds from baseline evidence.
2. **After Task 6:** approve evidence ontology and backfill/recovery strategy.
3. **After Task 9:** prove base atomicity before Workflow V2 canary.
4. **After Task 14:** prove C-G-M rebuild and snapshot safety before TGS rollout.
5. **After Task 17:** approve TGS plus agent quality/security/cost and LangSmith redaction gates.
6. **After Task 20:** approve context/topic stability and navigation model.
7. **Before Task 23:** choose connector pilot from real customer update/delete/ACL needs.
8. **After Task 24:** decide whether REST, internal agent API or MCP is the first adapter.

## Open Questions

1. Connector pilot: GitHub, Google Drive, Notion hay Slack?
2. Retention/hard-delete SLA cho raw source, superseded revisions và historical evidence?
3. Historical explicit-URI reads có được phép cho audit users không?
4. Context promotion/merge thresholds và acceptable taxonomy churn sẽ được freeze từ dataset nào?
5. TGS default mode nên là explicit hay auto-select sau khi latency/cost baseline có số liệu?
