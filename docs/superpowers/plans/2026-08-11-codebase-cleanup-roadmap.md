# FLAE Codebase Cleanup Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved FLAE cleanup design as four independently testable and revertible plans.

**Architecture:** The program removes non-product surfaces first, promotes the current ingestion implementation to the official V1 contract second, reorganizes domain ownership third, and squashes disposable development database history only after models stabilize. Public HTTP, SSE, and WebSocket contracts remain under `/api/v1` throughout.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, Temporal, pytest, uv, GitNexus.

---

## Source of truth

- Design: `docs/superpowers/specs/2026-08-11-codebase-cleanup-design.md`
- Plan 1: `docs/superpowers/plans/2026-08-11-prune-non-product-surfaces.md`
- Plan 2: `docs/superpowers/plans/2026-08-11-canonical-ingestion-v1.md`
- Plan 3: `docs/superpowers/plans/2026-08-11-domain-architecture-reorganization.md`
- Plan 4: `docs/superpowers/plans/2026-08-11-database-baselines-and-final-pruning.md`

## Preconditions

The repository currently contains substantial owner changes outside these plan documents. Cleanup implementation must not begin in that dirty state.

- [ ] **Step 1: Record the current branch and worktree state**

Run:

```bash
git branch --show-current
git status --short
git diff --stat
git diff --cached --stat
```

Expected: the branch is identified and every owner change is visible. Do not stage, stash, discard, or commit those changes without explicit owner direction.

- [ ] **Step 2: Obtain an owner-approved checkpoint commit**

The owner must choose the exact commit that contains the evidence-first Company Memory work this cleanup was designed against. Record it:

```bash
git rev-parse --verify HEAD
```

Expected: one 40-character commit SHA. The cleanup branch/worktree must start from this SHA.

- [ ] **Step 3: Create an isolated cleanup worktree**

Invoke `superpowers:using-git-worktrees`, then create or select a branch named:

```text
refactor/codebase-cleanup
```

Expected: the cleanup worktree is clean and `git rev-parse HEAD` equals the approved checkpoint SHA.

- [ ] **Step 4: Rebuild GitNexus in the cleanup worktree**

Create the immutable comparison tag before analysis:

```bash
git tag -a cleanup-base-2026-08-11 -m "codebase cleanup baseline" HEAD
git rev-parse cleanup-base-2026-08-11
```

Expected: the tag resolves to the approved checkpoint SHA. If the tag already exists, verify it resolves to the approved SHA instead of moving it.

Run:

```bash
node .gitnexus/run.cjs analyze --force
node .gitnexus/run.cjs status
```

Expected: analysis succeeds and status reports the cleanup branch commit as current.

- [ ] **Step 5: Capture the full verification baseline**

Run:

```bash
uv run --project backend pytest
npm --prefix frontend run test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all commands exit `0`. If any command fails, stop and either fix the baseline in a separate commit or obtain explicit approval to document a known pre-existing failure.

## Risk register

| Plan | Risk | Reason | Mandatory gate |
|---|---|---|---|
| Plan 1: product/demo pruning | LOW | Placeholder pages and greeting demo have no indexed execution flows; lazy imports make graph evidence partial | Router/navigation/static-reference scans and focused UI/worker tests |
| Plan 2: canonical ingestion V1 | HIGH | Dynamic Temporal registrations and replay semantics are incompletely represented in the call graph | Characterization, replay, idempotency, atomic publish, worker isolation, and full ingestion parity |
| Plan 3: domain reorganization | HIGH | Broad import-path changes across API, services, models, tests, workers, and frontend features | One domain per commit, import-cycle checks, complete type/test suites |
| Plan 4: migration baselines | CRITICAL | RLS, grants, constraints, views, triggers, and clean-install correctness protect tenant data | Disposable database comparison, RLS tests, schema manifest equality, explicit environment guard |

Do not proceed past a HIGH or CRITICAL gate when its required verification is failing.

## Execution order

### Task 1: Prune non-product surfaces

Execute every task in:

```text
docs/superpowers/plans/2026-08-11-prune-non-product-surfaces.md
```

Exit criteria:

- `/dashboard` redirects to `/dashboard/chat`.
- Briefing, Inbox, Reports, fixture Dashboard, and Greeting demo are absent.
- Retained shell, auth, workspace, and chat tests pass.
- GitNexus `detect_changes(scope="compare", base_ref="cleanup-base-2026-08-11")` contains only expected shell and worker processes.

### Task 2: Establish the canonical ingestion V1

Execute every task in:

```text
docs/superpowers/plans/2026-08-11-canonical-ingestion-v1.md
```

Exit criteria:

- Exactly one ingestion start path exists.
- The current references-only implementation is registered as `KnowledgeIngestionWorkflowV1`.
- Internal files, classes, settings, task queues, and worker names contain no V2 transition naming.
- Legacy workflow, activities, flags, rollout, audit, retirement, and fallback code are absent.
- Ingestion parity and failure-isolation suites pass.

### Task 3: Reorganize domain ownership

Execute every task in:

```text
docs/superpowers/plans/2026-08-11-domain-architecture-reorganization.md
```

Exit criteria:

- API handlers remain under `/api/v1` and live in `app/api/v1/routes/`.
- `knowalge_base`, `sche_*`, and `srv_*` paths are absent.
- SQLAlchemy entity models live under `app/models/`; `app/db/` contains infrastructure only.
- Chat owns session/message/citation transport, types, hooks, and UI.
- Architecture tests reject reverse dependencies and direct API database access.

### Task 4: Squash baselines and remove residual waste

Execute every task in:

```text
docs/superpowers/plans/2026-08-11-database-baselines-and-final-pruning.md
```

Exit criteria:

- `flae_db` and `rag_db` each have one reviewed pre-release baseline revision.
- Empty disposable databases reach head and match the approved schema manifest.
- RLS, grants, tenant isolation, immutability, and ingestion-role tests pass.
- Obsolete documentation, generated inventory, orphan configuration, and unused dependencies are absent.
- The final end-to-end smoke flow passes.

## Program completion

- [ ] **Step 1: Run all repository checks from the cleanup worktree**

Run:

```bash
uv run --project backend pytest
uv run --project backend pytest --cov=app --cov-report=term-missing
uv run --project backend pyrefly check
npm --prefix frontend run test
npm --prefix frontend run test:coverage
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

Expected: all commands exit `0`; backend and frontend retained source coverage is at least 75%.

- [ ] **Step 2: Run the core Docker smoke flow**

Run:

```bash
docker compose up -d postgres redis firebase-emulator temporal backend application-worker knowledge-worker
uv run --project backend pytest \
  backend/tests/services/test_ingestion_start.py \
  backend/tests/services/test_atomic_base_publish.py \
  backend/tests/services/test_knowledge_query_service.py \
  backend/tests/services/test_agent_chat_paths.py -q
E2E_REAL_BACKEND_URL=http://127.0.0.1:8000/api/v1 \
  npm --prefix frontend run test:e2e -- real-backend.smoke.spec.ts
docker compose down
```

Expected: service-path tests pass ingestion, authorized retrieval, and agent chat composition; the real backend health test passes; `docker compose down` exits `0`.

- [ ] **Step 3: Scan for forbidden residue**

Run:

```bash
git grep -n -E 'Morning briefing|BRIEFING|/dashboard/briefing|/dashboard/inbox|/dashboard/reports|GreetingWorkflow|DocumentIngestionWorkflow|IngestionWorkflowV2|INGESTION_V2|INGESTION_FORCE_V1|knowalge_base|sche_[a-z]|srv_[a-z]' -- ':!docs/superpowers/**'
git ls-files | grep -E '(^|/)(__pycache__|\.pytest_cache|coverage|dist)(/|$)|\.pyc$|repo_map\.txt$'
```

Expected: both commands print no matches and exit `1` because `grep` found nothing.

- [ ] **Step 4: Review final execution-flow impact**

Invoke:

```text
detect_changes({scope: "compare", base_ref: "cleanup-base-2026-08-11"})
```

Expected: only the product-shell, ingestion, API/module ownership, database bootstrap, and chat flows described by the four plans are affected. Investigate every unexpected process before continuing.

- [ ] **Step 5: Commit the final audit evidence**

```bash
git add docs/operations/codebase-cleanup-verification.md
git commit -m "docs: record codebase cleanup verification"
```

Expected: the commit contains the commands, exit codes, coverage totals, database schema comparison, E2E result, and GitNexus process summary from this run.
