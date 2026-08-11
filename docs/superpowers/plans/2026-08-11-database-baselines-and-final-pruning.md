# Database Baselines and Final Pruning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace disposable pre-release migration history with one verified baseline per application database, then remove residual code, configuration, dependency, artifact, and documentation waste.

**Architecture:** Existing migration chains first produce reference schemas in disposable databases. New core and RAG baselines are accepted only when catalog dumps, RLS policies, grants, views, functions, triggers, constraints, and clean-install tests match the reference behavior; reset operations are explicitly guarded to local/test environments.

**Tech Stack:** PostgreSQL 15, pgvector, Alembic, SQLAlchemy, psycopg, asyncpg, pytest, Docker Compose, uv, npm, GitNexus.

---

## Critical-risk warning

This plan is CRITICAL risk. A migration that creates tables successfully can still be unsafe if it omits RLS, `FORCE ROW LEVEL SECURITY`, restricted column grants, immutable-row triggers, security-invoker views, ingestion-role permissions, or tenant-scoped policies. Never run a reset command against a shared, staging, or production database.

## Baseline revisions

```text
backend/migrations/versions/core_0001_baseline.py
backend/rag_migrations/versions/rag_0001_baseline.py
```

Both revisions use `down_revision = None`. No legacy upgrade compatibility is retained.

### Task 1: Capture reference schemas before deleting migration history

**Files:**

- Create: `backend/scripts/dump_schema.sh`
- Create: `backend/tests/migrations/test_schema_dump_script.py`
- Create: `docs/operations/schema-baseline-reference.md`

- [ ] **Step 1: Add a deterministic schema-dump script test**

Create a test that asserts the script contains all required dump surfaces:

```python
from pathlib import Path


def test_schema_dump_captures_security_and_schema_objects() -> None:
    script = (
        Path(__file__).parents[2] / "scripts" / "dump_schema.sh"
    ).read_text(encoding="utf-8")

    assert "pg_dump --schema-only --no-owner" in script
    assert "pg_dumpall --roles-only" in script
    assert "pg_policies" in script
    assert "information_schema.role_table_grants" in script
    assert "pg_trigger" in script
    assert "pg_views" in script
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
uv run --project backend pytest backend/tests/migrations/test_schema_dump_script.py -q
```

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Create the deterministic dump script**

Create `backend/scripts/dump_schema.sh` using `apply_patch`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 3 ]]; then
  echo "usage: dump_schema.sh DATABASE_URL DATABASE_NAME OUTPUT_DIR" >&2
  exit 2
fi

database_url="$1"
database_name="$2"
output_dir="$3"
mkdir -p "$output_dir"

pg_dump --schema-only --no-owner --dbname "$database_url" \
  | sed -E '/^--/d; /^\\(un)?restrict /d; /^SET /d; /^SELECT pg_catalog\.set_config/d; /^[[:space:]]*$/d' \
  > "$output_dir/${database_name}-schema.sql"

pg_dumpall --roles-only --no-role-passwords --database "$database_url" \
  | sed -E '/^--/d; /^\\(un)?restrict /d; /^SET /d; /^[[:space:]]*$/d' \
  > "$output_dir/${database_name}-roles.sql"

psql "$database_url" --no-align --tuples-only --field-separator $'\t' <<'SQL' \
  > "$output_dir/${database_name}-catalog.tsv"
SELECT 'policy', schemaname, tablename, policyname, permissive, roles::text,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 'grant', table_schema, table_name, grantee, privilege_type, '', '', '', ''
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
UNION ALL
SELECT 'trigger', event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement, '', ''
FROM information_schema.triggers
WHERE event_object_schema = 'public'
UNION ALL
SELECT 'view', schemaname, viewname, '', '', '', definition, '', ''
FROM pg_views
WHERE schemaname = 'public'
ORDER BY 1, 2, 3, 4, 5;
SQL
```

Make it executable:

```bash
chmod +x backend/scripts/dump_schema.sh
```

- [ ] **Step 4: Run the script test**

```bash
uv run --project backend pytest backend/tests/migrations/test_schema_dump_script.py -q
```

Expected: PASS.

- [ ] **Step 5: Create disposable reference databases**

With PostgreSQL running, execute:

```bash
createdb --host localhost --username postgres flae_core_reference
createdb --host localhost --username postgres flae_rag_reference
```

Run current chains:

```bash
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_reference \
  uv run --project backend alembic -c backend/alembic.ini upgrade head
RAG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_rag_reference \
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_reference \
  uv run --project backend alembic -c backend/alembic-rag.ini upgrade head
```

Expected: both upgrades exit `0`.

- [ ] **Step 6: Dump reference schemas**

```bash
mkdir -p /tmp/flae-schema-reference
backend/scripts/dump_schema.sh \
  postgresql://postgres:postgres@localhost:5432/flae_core_reference \
  core \
  /tmp/flae-schema-reference
backend/scripts/dump_schema.sh \
  postgresql://postgres:postgres@localhost:5432/flae_rag_reference \
  rag \
  /tmp/flae-schema-reference
shasum -a 256 /tmp/flae-schema-reference/*
```

Expected: six non-empty dump files and six SHA-256 values.

- [ ] **Step 7: Record the reference manifest**

In `schema-baseline-reference.md`, record:

- exact source commit SHA;
- current core and RAG Alembic heads;
- all six dump hashes;
- table/view/policy/trigger counts from the dump files;
- the command transcript and exit codes.

Do not commit credentials; use sanitized URLs in documentation.

- [ ] **Step 8: Commit reference tooling and evidence**

```bash
git add backend/scripts/dump_schema.sh backend/tests/migrations/test_schema_dump_script.py docs/operations/schema-baseline-reference.md
git commit -m "test: capture pre-squash database schema reference"
```

Run `detect_changes({scope: "staged"})` before committing; expected risk is LOW because only tooling/tests/docs change.

### Task 2: Generate and verify the clean core baseline

**Files:**

- Delete: every existing file under `backend/migrations/versions/`
- Create: `backend/migrations/versions/core_0001_baseline.py`
- Modify: core migration tests

- [ ] **Step 1: Add a clean-baseline contract test**

Create or update a core migration test to assert:

```python
from alembic.config import Config
from alembic.script import ScriptDirectory


def test_core_has_one_pre_release_baseline() -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    revisions = list(ScriptDirectory.from_config(config).walk_revisions())

    assert [(revision.revision, revision.down_revision) for revision in revisions] == [
        ("core_0001", None)
    ]
```

Delete tests that require upgrading from an older development revision. Keep clean-install, model, constraint, and tenant tests.

- [ ] **Step 2: Run the contract test and verify it fails**

```bash
uv run --project backend pytest backend/tests/migrations -k 'core and baseline' -q
```

Expected: FAIL because multiple core revisions exist.

- [ ] **Step 3: Create an empty target database and remove old version files**

```bash
createdb --host localhost --username postgres flae_core_baseline
git rm backend/migrations/versions/*.py
```

- [ ] **Step 4: Generate the baseline from final core metadata**

```bash
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_baseline \
  uv run --project backend alembic -c backend/alembic.ini revision \
  --autogenerate \
  --rev-id core_0001 \
  -m baseline
```

Expected: `core_0001_baseline.py` creates the final user, workspace, membership, invitation, agent, chat/session, knowledge-document, and connector tables represented by `app.models.base.Base.metadata`.

- [ ] **Step 5: Review generated core SQL before applying**

```bash
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_baseline \
  uv run --project backend alembic -c backend/alembic.ini upgrade head --sql \
  > /tmp/flae-core-baseline.sql
git diff -- backend/migrations/versions/core_0001_baseline.py
```

Verify the migration does not create `briefing_items`, `integration_configs`, or any table absent from final models. Verify every foreign key and unique constraint from current model metadata appears.

- [ ] **Step 6: Apply and compare the new core schema**

```bash
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_baseline \
  uv run --project backend alembic -c backend/alembic.ini upgrade head
mkdir -p /tmp/flae-schema-baseline
backend/scripts/dump_schema.sh \
  postgresql://postgres:postgres@localhost:5432/flae_core_baseline \
  core \
  /tmp/flae-schema-baseline
diff -u /tmp/flae-schema-reference/core-catalog.tsv /tmp/flae-schema-baseline/core-catalog.tsv
```

Expected: no catalog diff. Review schema SQL differences caused solely by constraint/index naming; resolve semantic differences before continuing.

- [ ] **Step 7: Run core clean-install tests**

```bash
uv run --project backend pytest backend/tests/migrations backend/tests/api backend/tests/services/test_workspace_services.py -q
```

Expected: PASS.

- [ ] **Step 8: Commit the core baseline**

```bash
git add backend/migrations backend/tests/migrations
git commit -m "refactor: squash core database migrations"
```

Run `detect_changes({scope: "staged"})` before committing and confirm migration/bootstrap scope only.

### Task 3: Fold the RAG migration chain into one baseline

**Files:**

- Delete: existing `backend/rag_migrations/versions/*.py`
- Create: `backend/rag_migrations/versions/rag_0001_baseline.py`
- Modify: RAG migration tests

- [ ] **Step 1: Replace legacy-upgrade expectations with one-baseline expectations**

Update `test_rag_migrations.py`:

```python
def test_rag_has_one_pre_release_baseline() -> None:
    config = Config(str(BACKEND_ROOT / "alembic-rag.ini"))
    revisions = list(ScriptDirectory.from_config(config).walk_revisions())

    assert [(revision.revision, revision.down_revision) for revision in revisions] == [
        ("rag_0001", None)
    ]
```

Replace `test_disposable_database_clean_install_and_legacy_upgrade` with a clean-install-only test. Keep its final assertions for `document_revisions`, `current_chunks`, semantic evidence fields, graph snapshots, discovery snapshots, and memory-state projections, but do not insert or upgrade a legacy chunk.

- [ ] **Step 2: Run the RAG baseline contract and verify it fails**

```bash
uv run --project backend pytest backend/tests/migrations/test_rag_migrations.py -q
```

Expected: FAIL because 19 revisions exist.

- [ ] **Step 3: Build one self-contained baseline in chronological order**

Create `rag_0001_baseline.py` with:

```python
revision = "rag_0001"
down_revision = None
branch_labels = None
depends_on = None
```

Fold the existing `upgrade()` operations, their constants, and helper functions into the new file in this exact order:

```text
0001_baseline_rag_schema
0002_add_revisions_and_runs
0003_add_chunk_provenance
0004_add_evidence_schema
0005_force_rag_rls
0006_immutability_and_least_privilege
0007_add_base_staging
0008_add_ingestion_role
0009_restrict_staging_to_ingestion
0010_grant_evidence_ingestion
0011_add_entity_resolution_versions
0012_add_relationship_projections
0013_add_atomic_graph_snapshots
0014_add_versioned_topic_discovery
0015_add_discovery_snapshots
0016_add_memory_state_projections
0017_add_semantic_evidence_fields
0018_add_graph_semantic_projections
0019_pin_semantic_graph_snapshots
```

While folding, remove operations made obsolete later in the chain: do not create a view/policy only to drop and recreate it; emit only its final definition. Preserve separate `op.execute` calls for each DDL statement so asyncpg never receives a multi-statement prepared query.

The baseline `downgrade()` must drop final views and triggers before functions/tables, revoke role memberships/grants, and then drop application roles created by the baseline.

- [ ] **Step 4: Delete old RAG version files after the baseline is self-contained**

```bash
git rm backend/rag_migrations/versions/000*.py
```

Do not delete `rag_0001_baseline.py`.

- [ ] **Step 5: Run static security contract tests**

```bash
uv run --project backend pytest \
  backend/tests/migrations/test_rag_migration_contract.py \
  backend/tests/security/test_rag_rls.py \
  backend/tests/security/test_rag_repository.py -q
```

Expected: PASS. The baseline contains owner-safe roles, `FORCE ROW LEVEL SECURITY`, `WITH CHECK`, immutable triggers, security-invoker views, and least-privilege grants.

- [ ] **Step 6: Apply the RAG baseline to an empty database**

```bash
createdb --host localhost --username postgres flae_rag_baseline
RAG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_rag_baseline \
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_baseline \
  uv run --project backend alembic -c backend/alembic-rag.ini upgrade head
```

Expected: upgrade exits `0` and Alembic head is `rag_0001`.

- [ ] **Step 7: Compare RAG schema and security catalogs**

```bash
backend/scripts/dump_schema.sh \
  postgresql://postgres:postgres@localhost:5432/flae_rag_baseline \
  rag \
  /tmp/flae-schema-baseline
diff -u /tmp/flae-schema-reference/rag-catalog.tsv /tmp/flae-schema-baseline/rag-catalog.tsv
```

Expected: no differences in policies, grants, triggers, or views. Compare schema SQL and resolve every table, column, type, constraint, index, function, and view difference before accepting the baseline.

- [ ] **Step 8: Run full RAG clean-install and tenant tests**

```bash
RAG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_rag_baseline \
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/flae_core_baseline \
  uv run --project backend pytest backend/tests/migrations backend/tests/security backend/tests/models -q
```

Expected: PASS.

- [ ] **Step 9: Commit the RAG baseline**

Run `detect_changes({scope: "staged"})`; expected scope is schema bootstrap/security tests only.

```bash
git add backend/rag_migrations backend/tests/migrations backend/tests/security
git commit -m "refactor: squash rag database migrations"
```

### Task 4: Add an explicitly guarded development reset command

**Files:**

- Create: `backend/scripts/reset_development_state.py`
- Create: `backend/tests/scripts/test_reset_development_state.py`
- Modify: `backend/pyproject.toml`
- Modify: `README.md`

- [ ] **Step 1: Write environment and database guard tests**

Test these cases:

```python
@pytest.mark.parametrize("environment", ["staging", "production"])
def test_reset_rejects_non_development_environment(environment: str) -> None:
    with pytest.raises(RuntimeError, match="local or test"):
        validate_reset_target(environment, CORE_URL, RAG_URL, STATE_URL)


def test_reset_rejects_unexpected_database_names() -> None:
    with pytest.raises(RuntimeError, match="unexpected database"):
        validate_reset_target(
            "local",
            CORE_URL.replace("/flae_db", "/customer_data"),
            RAG_URL,
            STATE_URL,
        )
```

Also test that the exact names `flae_db`, `rag_db`, and `flae_agent_state_db` pass in `local` and `test`.

- [ ] **Step 2: Run tests and verify they fail**

```bash
uv run --project backend pytest backend/tests/scripts/test_reset_development_state.py -q
```

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement the pure validation boundary**

Use:

```python
ALLOWED_ENVIRONMENTS = frozenset({"local", "test"})
EXPECTED_DATABASES = (
    "flae_db",
    "rag_db",
    "flae_agent_state_db",
)


def validate_reset_target(
    environment: str,
    core_url: str,
    rag_url: str,
    state_url: str,
) -> tuple[str, str, str]:
    if environment not in ALLOWED_ENVIRONMENTS:
        raise RuntimeError("Reset is limited to local or test environments")
    names = tuple(
        make_url(url.replace("postgresql://", "postgresql+psycopg://", 1)).database
        for url in (core_url, rag_url, state_url)
    )
    if names != EXPECTED_DATABASES:
        raise RuntimeError(f"Refusing unexpected database targets: {names!r}")
    return cast(tuple[str, str, str], names)
```

The command must require a literal `--confirm RESET-FLAE-DEVELOPMENT-DATA`. It drops/recreates only the three expected databases through quoted psycopg identifiers, then runs both Alembic upgrades. Temporal histories are reset through the documented `docker compose down --volumes` operation, not by issuing ad-hoc deletes against Temporal tables.

- [ ] **Step 4: Add the package command**

```toml
reset-development-state = "scripts.reset_development_state:main"
```

- [ ] **Step 5: Run guard tests**

```bash
uv run --project backend pytest backend/tests/scripts/test_reset_development_state.py -q
```

Expected: PASS.

- [ ] **Step 6: Document the approval-gated reset sequence**

README instructions must state:

```bash
docker compose down --volumes
uv run --project backend reset-development-state \
  --confirm RESET-FLAE-DEVELOPMENT-DATA
docker compose up -d
```

Require the operator to inspect `ENVIRONMENT`, the three URLs, and database names before confirming.

- [ ] **Step 7: Commit reset safety**

```bash
git add backend/scripts backend/tests/scripts backend/pyproject.toml README.md
git commit -m "feat: add guarded development data reset"
```

Run `detect_changes({scope: "staged"})` before the commit.

### Task 5: Remove tracked artifacts, stale configuration, and unused dependencies

**Files:**

- Delete: `repo_map.txt`
- Delete: `docs/features/topics/PLAN.md`
- Delete: `docs/features/topics/SPEC.md`
- Modify: `.gitignore`
- Modify: `backend/.gitignore`
- Modify: `frontend/.gitignore`
- Modify: `backend/pyproject.toml`
- Modify: `frontend/package.json`
- Modify: lock files through package managers only
- Modify: environment examples and docs returned by residue scans

- [ ] **Step 1: Remove the generated repository inventory**

```bash
git rm repo_map.txt
git rm docs/features/topics/PLAN.md
git rm docs/features/topics/SPEC.md
```

- [ ] **Step 2: Verify generated outputs are ignored**

Ensure ignore files cover:

```gitignore
__pycache__/
*.py[cod]
.pytest_cache/
.coverage
coverage/
dist/
playwright-report/
test-results/
```

Do not ignore source migrations, fixtures, or test snapshots.

- [ ] **Step 3: Scan backend dependencies**

```bash
uv run --project backend --with deptry deptry backend \
  --ignore DEP003
```

Expected: review each reported unused or transitive dependency against worker entry points, Alembic environments, scripts, and optional evaluation paths. For each confirmed unused direct dependency, assign the exact deptry result to `PACKAGE_NAME` and run:

```bash
uv remove --project backend "$PACKAGE_NAME"
```

Run one `uv remove` command per dependency so lockfile changes are attributable.

- [ ] **Step 4: Scan frontend dependencies and files**

```bash
npx --yes knip --directory frontend --production
```

Expected: review every result against Vite config, Playwright config, test setup, and dynamically imported routes. For each confirmed unused package, assign the exact Knip result to `PACKAGE_NAME` and run:

```bash
npm --prefix frontend uninstall "$PACKAGE_NAME"
```

Run one uninstall per dependency.

- [ ] **Step 5: Scan orphan settings and environment variables**

```bash
git grep -n -E 'INGESTION_V2|INGESTION_FORCE_V1|TEMPORAL_INGESTION_TASK_QUEUE|flae-ingestion-v2-queue|flae-default-queue' -- ':!docs/superpowers/**'
```

Expected: no matches. Remove orphan settings from `config.py`, both environment examples, Compose, tests, scripts, and operations docs.

- [ ] **Step 6: Run lockfile-aware verification**

```bash
uv sync --project backend --locked
npm --prefix frontend ci
uv run --project backend pytest backend/tests/architecture -q
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all commands exit `0`.

- [ ] **Step 7: Commit residual code/dependency cleanup**

Run `detect_changes({scope: "staged"})`, then:

```bash
git add .gitignore backend frontend .env.example README.md docs
git commit -m "chore: remove residual code and dependency waste"
```

### Task 6: Refresh documentation and run final verification

**Files:**

- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `frontend/README.md`
- Modify: current operations docs
- Create: `docs/operations/codebase-cleanup-verification.md`

- [ ] **Step 1: Update architecture and runtime documentation**

Document only:

- retained product features;
- `/dashboard/chat` as the authenticated default;
- `/api/v1` as the public API boundary;
- `application-worker` and `knowledge-worker`;
- official `KnowledgeIngestionWorkflowV1` contract;
- core/RAG/agent-state database responsibilities;
- clean migration and guarded reset commands;
- current quality commands.

Delete statements that claim Briefing, Inbox, Reports, Dashboard preview, legacy ingestion, canary rollout, or old worker names exist.

- [ ] **Step 2: Run complete backend verification**

```bash
uv run --project backend pytest
uv run --project backend pytest --cov=app --cov-report=term-missing
uv run --project backend pyrefly check
```

Expected: all commands exit `0`; retained backend coverage is at least 75%.

- [ ] **Step 3: Run complete frontend verification**

```bash
npm --prefix frontend run test
npm --prefix frontend run test:coverage
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:e2e
```

Expected: all commands exit `0`; retained frontend coverage is at least 75%.

- [ ] **Step 4: Run clean database and real-backend smoke verification**

After explicit approval to destroy local volumes:

```bash
docker compose down --volumes
docker compose up -d postgres redis firebase-emulator temporal
uv run --project backend reset-development-state \
  --confirm RESET-FLAE-DEVELOPMENT-DATA
docker compose up -d backend application-worker knowledge-worker
E2E_REAL_BACKEND_URL=http://127.0.0.1:8000/api/v1 \
  npm --prefix frontend run test:e2e -- real-backend.smoke.spec.ts
```

Expected: clean migrations complete, all services remain healthy, and the real-backend smoke test passes.

- [ ] **Step 5: Run final forbidden-residue scans**

```bash
git grep -n -E 'Morning briefing|BRIEFING|/dashboard/briefing|/dashboard/inbox|/dashboard/reports|GreetingWorkflow|DocumentIngestionWorkflow|IngestionWorkflowV2|INGESTION_V2|INGESTION_FORCE_V1|knowalge_base|app\.schemas\.sche_|app\.services\.srv_' -- ':!docs/superpowers/**'
git ls-files | grep -E '(^|/)(__pycache__|\.pytest_cache|coverage|dist)(/|$)|\.pyc$|repo_map\.txt$'
```

Expected: both scans print no matches.

- [ ] **Step 6: Run final GitNexus checks**

Invoke:

```text
check({repo: "flae-agents", cycles: true})
detect_changes({scope: "compare", base_ref: "cleanup-base-2026-08-11"})
```

Expected: no import cycles; affected processes match the approved cleanup design and the four implementation plans.

- [ ] **Step 7: Record verification evidence and commit**

Write exact command lines, timestamps, exit codes, test counts, coverage totals, reference/baseline schema hashes, smoke result, residue-scan output, and GitNexus summary to `codebase-cleanup-verification.md`.

```bash
git add README.md backend/README.md frontend/README.md docs/operations
git commit -m "docs: record codebase cleanup verification"
```
