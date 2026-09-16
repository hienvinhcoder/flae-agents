# TGS Parity Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an offline CLI that compares FLAE vs demo-app TGS stages (chunk → fuse merge → retrieve scoring) with no DB/LLM calls, using **today’s** FLAE retrieval code—not restored deleted modules.

**Architecture:** Harness under `backend/app/evaluation/tgs_parity/` + thin CLI. Chunk/fuse call live FLAE + demo-app APIs. Retrieve v1 compares **pure scoring helpers already in** `retrieval/helpers.py` (`filter_redundant_paths`, `score_paths_component_based`, `score_chunks`) against demo-app’s equivalent methods / fixtures, with canned embeddings. If the current retriever is hard to call offline, **thin-extract** only the pure functions needed (keep `RetrieverService` as DB/LLM orchestrator). Scale later: in-memory beam, then full path orchestration.

**Tech Stack:** Python 3, `uv`, numpy, existing `ChunkingService` / fusion merge / `retrieval/helpers.py`, local gitignored `demo-app/examples-app`.

## Global Constraints

- Offline only: no Postgres, no Gemini, no network for a green run.
- **Do not** restore deleted `tgs_retriever.py` / `TGSModels` from git history.
- **Do not** grow a second parallel retriever; refactor current code only when needed for offline purity.
- No LLM extraction; fusion `>threshold` only asserts `would_summarize=true`.
- `demo-app/` stays gitignored; `--demo-app` or default relative path.
- Chunk knobs: fixed `1200/100`; semantic `900/150`, `pre_context_limit=50`, `hard_limit=500`.
- Fusion threshold: `3`.
- Spec: `docs/superpowers/specs/2026-09-14-tgs-parity-harness-design.md`.

### Incremental retrieve scale-up

| Slice | Compare what | When |
|---|---|---|
| **v1 (this plan)** | `filter_redundant_paths`, `score_paths_component_based`, `score_chunks` (+ graph vote Counter feeding chunks) with fixture embeddings/maps | Now |
| **v2 (later)** | Pure in-memory beam expand given neighbor map (extract from `_graph_pathfinding_beam_search`) | After v1 green |
| **v3 (later)** | End-to-end offline orchestration (seeds → paths → votes → ranked chunks) without SQL | After v2 |

---

## File structure

| Path | Responsibility |
|---|---|
| `backend/app/services/knowledge/retrieval/helpers.py` | Keep; optionally tiny pure extractions only if harness needs them |
| `backend/app/services/knowledge/retrieval/retriever.py` | Keep as orchestrator; no algorithm rewrite in v1 |
| `backend/tests/services/test_tgs_retriever.py` | **Delete** (orphaned; imports missing deleted modules) |
| `docs/datasets/tgs-parity/documents/*.md` | 3 LuminaOps probe copies |
| `docs/datasets/tgs-parity/fusion_cases.json` | Canned merge cases |
| `docs/datasets/tgs-parity/retrieve_cases.json` | Fixture embeddings + paths + expected scores/order |
| `docs/datasets/tgs-parity/README.md` | Runbook + scale-up notes |
| `backend/app/evaluation/tgs_parity/*` | normalize, diff, report, adapters, runner |
| `backend/scripts/compare_tgs_parity.py` | CLI |
| `backend/tests/evaluation/test_tgs_parity_helpers.py` | Unit tests |

---

### Task 1: Remove orphaned TGSRetriever tests

**Files:**
- Delete: `backend/tests/services/test_tgs_retriever.py`

**Why:** File imports `app.services.knowledge.retrieval.models` / `tgs_retriever` that are not part of the current product path. Restoring them would fork the codebase against `RetrieverService`.

- [ ] **Step 1: Confirm orphan status**

Run: `uv run --project backend pytest backend/tests/services/test_tgs_retriever.py -q`
Expected: `ModuleNotFoundError`

- [ ] **Step 2: Delete the orphaned test file**

```bash
rm backend/tests/services/test_tgs_retriever.py
```

- [ ] **Step 3: Confirm collection clean**

Run: `uv run --project backend pytest backend/tests/services/ -q --collect-only 2>&1 | tail -20`
Expected: no reference to `test_tgs_retriever` / `TGSRetriever`

- [ ] **Step 4: Commit** (only if user asked)

```bash
git add -u backend/tests/services/test_tgs_retriever.py
git commit -m "$(cat <<'EOF'
chore: remove orphaned TGSRetriever unit tests

EOF
)"
```

---

### Task 2: Corpus + stage fixtures

**Files:**
- Create: `docs/datasets/tgs-parity/documents/{01-handbook,04-adr-014-pgvector,05-contract-khang-minh}.md`
- Create: `docs/datasets/tgs-parity/fusion_cases.json`
- Create: `docs/datasets/tgs-parity/retrieve_cases.json`
- Create: `docs/datasets/tgs-parity/README.md`

**Interfaces:**
- Produces fixture schemas for `runner.py`

- [ ] **Step 1: Copy documents**

```bash
mkdir -p docs/datasets/tgs-parity/documents
cp docs/datasets/luminaops/documents/01-handbook.md \
   docs/datasets/luminaops/documents/04-adr-014-pgvector.md \
   docs/datasets/luminaops/documents/05-contract-khang-minh.md \
   docs/datasets/tgs-parity/documents/
```

- [ ] **Step 2: Write `fusion_cases.json`**

```json
{
  "threshold": 3,
  "cases": [
    {
      "case_id": "fuse-merge-two",
      "group_name": "Atlas",
      "desc_type": "entity",
      "descriptions": [
        "Atlas Edge owns the event gateway.",
        "Atlas Edge serves the platform team."
      ],
      "expect": {
        "would_summarize": false,
        "merged_description": "Atlas Edge owns the event gateway. Atlas Edge serves the platform team."
      }
    },
    {
      "case_id": "fuse-dedupe-identical",
      "group_name": "Atlas",
      "desc_type": "entity",
      "descriptions": [
        "Atlas Edge owns the event gateway.",
        "Atlas Edge owns the event gateway."
      ],
      "expect": {
        "would_summarize": false,
        "merged_description": "Atlas Edge owns the event gateway."
      }
    },
    {
      "case_id": "fuse-would-summarize",
      "group_name": "Atlas",
      "desc_type": "entity",
      "descriptions": ["Desc one.", "Desc two.", "Desc three.", "Desc four."],
      "expect": { "would_summarize": true, "merged_description": null }
    }
  ]
}
```

`merged_description` must equal `" ".join(sorted(set(stripped)))` (same as FLAE `_merge_and_summarize_group` and demo-app).

- [ ] **Step 3: Write `retrieve_cases.json` for v1 scoring helpers**

Use tiny fixed vectors (dim = `settings.EMBEDDING_DIMENSIONS` or a test dim only if helpers accept maps without checking dim—today `batch_get_similarity` uses `settings.EMBEDDING_DIMENSIONS`). Prefer **real setting dimension** with simple orthogonal-ish vectors so cosine is stable.

Schema:

```json
{
  "mode": "flae_helpers_vs_demo",
  "slice": "v1_scoring",
  "cases": [
    {
      "case_id": "score-paths-basic",
      "kind": "score_paths",
      "query_embedding": [1.0, 0.0, "...padded to EMBEDDING_DIMENSIONS..."],
      "seed_entity_ids": ["e1"],
      "paths": [["e1", "e2"], ["e1", "e3"]],
      "local_entity_map": {
        "e1": { "embedding": [...], "degree": 2 },
        "e2": { "embedding": [...], "degree": 1 },
        "e3": { "embedding": [...], "degree": 1 }
      },
      "local_edge_map": {
        "e1|e2": {
          "relation_id": "r12",
          "embedding": [...],
          "degree": 1
        }
      },
      "expect": {
        "ordered_paths": [["e1", "e2"], ["e1", "e3"]],
        "score_tolerance": 1e-6
      }
    },
    {
      "case_id": "score-chunks-graph-vote",
      "kind": "score_chunks",
      "query_embedding": [...],
      "initial_chunk_ids": ["c-seed"],
      "chunk_recommendations_from_graph": { "c-seed": 1, "c-graph": 2 },
      "chunk_map": {
        "c-seed": { "embedding": [...], "source_id": "s1", "token_count": 8 },
        "c-graph": { "embedding": [...], "source_id": "s2", "token_count": 8 }
      },
      "expect": {
        "ordered_chunk_ids": ["c-seed", "c-graph"]
      }
    },
    {
      "case_id": "filter-redundant-paths",
      "kind": "filter_redundant",
      "paths": [
        { "path": ["a", "b"], "score": 0.5 },
        { "path": ["a", "b", "c"], "score": 0.9 }
      ],
      "expect": {
        "ordered_paths": [["a", "b", "c"]]
      }
    }
  ]
}
```

Notes for implementer:

- FLAE `local_edge_map` keys are `tuple(sorted((a, b)))`. In JSON store as `"a|b"` sorted; adapter parses to tuple.
- After writing vectors, run FLAE helpers once and paste actual `ordered_*` into `expect` so the fixture is self-consistent; then assert demo twin matches the same expect.
- Do **not** invent G2T/T2G flags for v1 — those land in v2/v3 when beam/orphan logic is extracted.

- [ ] **Step 4: Write README**

Cover: offline constraints, CLI commands, `slice: v1_scoring`, roadmap v2 beam / v3 orchestration, “no restore of deleted TGSRetriever”.

- [ ] **Step 5: Commit** (only if user asked)

---

### Task 3: Normalize, diff, report helpers (TDD)

**Files:**
- Create: `backend/app/evaluation/tgs_parity/__init__.py`
- Create: `backend/app/evaluation/tgs_parity/normalize.py`
- Create: `backend/app/evaluation/tgs_parity/diff.py`
- Create: `backend/app/evaluation/tgs_parity/report.py`
- Test: `backend/tests/evaluation/test_tgs_parity_helpers.py`

**Interfaces:**
- `normalize_chunk_text(text: str) -> str`
- `normalize_chunks(chunks: list[dict]) -> list[dict]`
- `StageCaseResult(stage, case_id, passed, diff_summary)`
- `diff_sequences(left, right, *, label) -> str`
- `build_report(results) -> dict` with `ok`, `stages`
- `format_table(results) -> str`
- `write_report(path, report) -> None`

- [ ] **Step 1: Write failing tests**

```python
from app.evaluation.tgs_parity.diff import StageCaseResult, diff_sequences
from app.evaluation.tgs_parity.normalize import normalize_chunk_text, normalize_chunks
from app.evaluation.tgs_parity.report import build_report, format_table


def test_normalize_strips_fffd_and_edges() -> None:
    assert normalize_chunk_text("\ufffd hello \ufffd") == "hello"
    assert normalize_chunk_text("  spaced  ") == "spaced"


def test_normalize_chunks_keeps_order_and_token_count() -> None:
    out = normalize_chunks(
        [{"text": " a ", "token_count": 1}, {"text": "b\ufffd", "token_count": 2}]
    )
    assert out == [{"text": "a", "token_count": 1}, {"text": "b", "token_count": 2}]


def test_diff_sequences_empty_when_equal() -> None:
    assert diff_sequences([1, 2], [1, 2], label="ids") == ""


def test_diff_sequences_reports_mismatch() -> None:
    msg = diff_sequences(["a"], ["b"], label="ids")
    assert "ids" in msg and "a" in msg and "b" in msg


def test_build_report_ok_flag() -> None:
    ok = StageCaseResult("chunk", "c1", True, "")
    bad = StageCaseResult("chunk", "c2", False, "mismatch")
    report = build_report([ok, bad])
    assert report["ok"] is False
    assert "PASS" in format_table([ok])
    assert "FAIL" in format_table([bad])
```

- [ ] **Step 2: Run — expect FAIL**

`uv run --project backend pytest backend/tests/evaluation/test_tgs_parity_helpers.py -q`

- [ ] **Step 3: Implement helpers** (same bodies as prior plan: strip `\ufffd`+whitespace; dataclass; JSON report)

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** (only if user asked)

---

### Task 4: Chunk + fuse adapters

**Files:**
- Create: `backend/app/evaluation/tgs_parity/adapters.py`
- Modify: `backend/tests/evaluation/test_tgs_parity_helpers.py`

**Interfaces:**
- `resolve_demo_app(path: Path | None) -> Path`
- `run_chunk_case(*, text, strategy, file_hash, demo_app, case_id) -> StageCaseResult`
- `deterministic_merge_description(descriptions, *, threshold=3) -> tuple[str | None, bool]`
- `demo_deterministic_merge(...)` — same algorithm as demo `fusion.py` ≤threshold branch (do **not** import demo fusion; avoids openai)
- `run_fuse_case(case: dict) -> StageCaseResult`

- [ ] **Step 1: Failing tests** for resolve missing path, merge under/over threshold, optional chunk parity if `demo-app/examples-app/chunks.py` exists

- [ ] **Step 2: Implement**

Chunk: FLAE `ChunkingService.chunk_text_fixed` / `chunk_text_semantic` with knobs above vs demo `chunks.chunk_text_*` via `sys.path`; compare `normalize_chunks`.

Fuse: both sides pure unique/sort/join; `>threshold` → `would_summarize=True` only.

- [ ] **Step 3: Pass tests**

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 5: Retrieve v1 adapters (current helpers) + runner + CLI

**Files:**
- Modify: `backend/app/evaluation/tgs_parity/adapters.py`
- Create: `backend/app/evaluation/tgs_parity/runner.py`
- Create: `backend/scripts/compare_tgs_parity.py`
- Modify: `backend/tests/evaluation/test_tgs_parity_helpers.py`
- Optional thin refactor: **only if** `score_*` cannot be called with fixtures as-is — then extract nothing new; fix fixture shape instead. Do **not** introduce `tgs_retriever.py`.

**Interfaces:**
- `run_retrieve_case(case: dict, *, demo_app: Path | None) -> StageCaseResult`
- `run_parity(*, stage, demo_app, dataset_root) -> list[StageCaseResult]`
- CLI: `--stage all|chunk|fuse|retrieve`, `--demo-app`, `--dataset-root`, `--report`

**Retrieve v1 compare strategy:**

1. **FLAE:** call `filter_redundant_paths` / `score_paths_component_based` / `score_chunks` from `app.services.knowledge.retrieval.helpers`.
2. **Demo:** either
   - (preferred when demo present) instantiate/import scoring twins by loading `retriever_db.py` methods that are pure given maps — **if** import pulls hard DB deps, fall back to
   - (always available) `demo_score_*` functions in adapters that copy demo-app formulas (same weights from `config.yaml` / FLAE settings).
3. Both must match fixture `expect` (and each other).

Report labels: `mode=flae_helpers_vs_demo`, `slice=v1_scoring`.

- [ ] **Step 1: Tests for fuse/retrieve fixtures + chunk skip-if-no-demo**

```python
from pathlib import Path
from app.evaluation.tgs_parity.runner import run_parity


def test_run_parity_fuse() -> None:
    results = run_parity(
        stage="fuse",
        demo_app=None,
        dataset_root=Path("docs/datasets/tgs-parity"),
    )
    assert results and all(r.passed for r in results), [r for r in results if not r.passed]


def test_run_parity_retrieve_v1() -> None:
    results = run_parity(
        stage="retrieve",
        demo_app=None,
        dataset_root=Path("docs/datasets/tgs-parity"),
    )
    assert results and all(r.passed for r in results), [r for r in results if not r.passed]
```

- [ ] **Step 2: Implement `run_retrieve_case`**

Parse JSON maps → numpy arrays; call FLAE helpers; call demo twin; diff ordered paths/chunk ids (and scores within tolerance if present).

- [ ] **Step 3: Implement `runner.py` + CLI** (same CLI shape as design doc)

Default dataset root: repo `docs/datasets/tgs-parity`.

- [ ] **Step 4: Smoke**

```bash
uv run --project backend pytest backend/tests/evaluation/test_tgs_parity_helpers.py -q
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage fuse
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage retrieve
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage chunk --demo-app demo-app/examples-app
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage all --demo-app demo-app/examples-app --report /tmp/tgs-parity.json
```

Expected: exit 0 when demo-app present; fuse+retrieve exit 0 without demo-app.

- [ ] **Step 5: Negative check** — mutate one expect → FAIL + non-zero exit → revert

- [ ] **Step 6: Commit** (only if user asked)

---

### Out of scope for this plan (explicit)

- Restoring `tgs_retriever.py` / `models.py` from history
- Rewriting `RetrieverService.retrieve` end-to-end
- v2 in-memory beam extract
- v3 full offline orchestration
- Live DB parity / LuminaOps answer scoring

---

## Spec coverage checklist

| Spec / intent | Task |
|---|---|
| Offline CLI, no DB/LLM | Task 5 |
| Chunk FLAE vs demo | Task 4–5 |
| Fuse deterministic + would_summarize | Task 2, 4–5 |
| Retrieve using **current** FLAE helpers | Task 5 |
| No restore deleted retriever | Task 1 + Global Constraints |
| Incremental scale (v1 only now) | Global Constraints + README |
| Corpus 3 docs | Task 2 |
| Report JSON + exit code | Task 3, 5 |

## Self-review notes

- Removed all “restore from commit 34c371b” work.
- Orphaned `test_tgs_retriever.py` is deleted, not fixed via zombie modules.
- Retrieve v1 targets helpers that already mirror demo-app (`_score_paths_component_based`, chunk recommendation scoring)—right surface for parity without a second algorithm tree.
- Refactor budget: zero new retrieval modules in v1 unless a helper signature blocks fixtures; prefer adapting fixtures.
