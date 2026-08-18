# Evidence-First Company Memory Checklist

Source spec: `docs/specs/agent_memory_contract.md`
Implementation plan: `tasks/plan.md`

## Phase 1: Contract and baselines

- [x] Task 1: Freeze transport-independent Company Memory domain models.
- [x] Task 2: Build Aurora, Helios and Atlas TGS/discovery evaluation fixtures.
- [x] Checkpoint A: Human review xác nhận contract, assumptions và non-goals.
  - [x] Offline baseline repeatable và không gọi production services.
  - [x] Graph-to-Text và Text-to-Graph ablations chứng minh failure modes mục tiêu.

## Phase 2: Storage and security

- [x] Task 3: Add a dedicated Alembic migration track for `rag_db`.
- [x] Task 4: Add immutable revisions, ingestion runs and stage manifests.
- [x] Task 5: Add structure-aware chunks, provenance and canonical resources.
- [x] Task 6: Add entity observations and assertion evidence.
- [x] Task 7: Enforce RLS and typed ACL-scoped repositories.
- [x] Checkpoint B: Upgrade, idempotency, provenance and tenant-isolation gates pass.

## Phase 3: Dual-speed base ingestion

- [x] Task 8: Implement deterministic reference-based base staging.
- [x] Task 9: Implement atomic base publish and authorized resource reads.
- [x] Task 10: Add typed Workflow V2 and isolated ingestion capacity.
- [ ] Checkpoint C: Base search canary meets replay, payload and time-to-searchable gates.

## Phase 4: Evidence-backed graph

- [x] Task 11: Extract revision-scoped observations/assertions separately from topics.
- [x] Task 12: Implement versioned and reversible entity resolution.
- [x] Task 13: Derive directed relationship projections and bidirectional `M`.
- [x] Task 14: Publish versioned C-G-M graph snapshots atomically.
- [x] Checkpoint D: Graph is rebuildable and every hop resolves source evidence.

## Phase 5: TGS retrieval capabilities

- [x] Task 15: Make visited memory, Graph-to-Text and orphan bridging conformant.
- [x] Task 16: Add evidence-backed search, graph exploration and source resolution results.
- [x] Task 17: Build the typed LangChain/LangGraph Company Memory agent runtime with optional redacted LangSmith tracing.
- [ ] Checkpoint E: Full TGS and agent runs beat target ablations with zero ACL leakage.

## Phase 6: Topics, contexts and memory state

- [ ] Task 18: Implement versioned topic discovery with promotion/hysteresis.
- [ ] Task 19: Implement stable overlapping context discovery.
- [ ] Task 20: Publish discovery snapshots and catalog/topic-TOC capabilities.
- [ ] Task 21: Add evidence-backed change, contradiction and gap projections.
- [ ] Checkpoint F: Context discovery, topic navigation and findings pass quality gates.

## Phase 7: Operations and rollout

- [ ] Task 22: Add LangSmith-aware agent, ingestion, TGS and discovery observability/SLOs.
- [ ] Task 23: Define delta-sync contract and implement one connector pilot.
- [ ] Task 24: Canary V2 and retire legacy paths through replay/rollback gates.
- [ ] Checkpoint G: Production-ready memory core; choose the first external adapter afterward.

## Standing Definition Of Done

- [ ] Focused behavior and failure-path tests pass.
- [ ] Affected backend suite passes with `uv run --project backend pytest`.
- [ ] Service/workflow boundaries use explicit Pydantic types.
- [ ] Schema changes include reviewed Alembic migrations and recovery notes.
- [ ] Workspace/ACL isolation and log redaction are tested.
- [ ] Documentation and configuration examples are updated.
- [ ] Legacy workflow/API behavior remains until compatibility gates pass.

## Deferred Until The Memory Core Is Stable

- [ ] Select and freeze REST/internal-agent/MCP adapter order.
- [ ] Discuss MCP tool names, pagination/output shapes and remote authorization.
- [ ] Add mutating agent capabilities only through a separate security-reviewed plan.
