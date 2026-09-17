# LuminaOps LangSmith Live Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an internal CLI that mirrors LuminaOps gold to LangSmith and runs live FLAE retrieval experiments with deterministic evaluators, observable in the LangSmith UI.

**Architecture:** Extend evaluation modules (metrics + LangSmith mirror/runner) around existing `LangSmithClientAdapter` and `RetrieverService`. CLI `flae-evaluate-luminaops` has `mirror` (dataset sync only) and `run --kb-id` (live retrieve + score). Observation UI is LangSmith; no FLAE SPA work.

**Tech Stack:** Python 3, Pydantic, LangSmith `Client.evaluate`, FastAPI-stack `RetrieverService`, `uv`, pytest.

**Spec:** `docs/superpowers/specs/2026-09-16-luminaops-langsmith-live-eval-design.md`

## Global Constraints

- Internal eng only; no public API route; no FLAE frontend UI.
- Offline gold in `docs/datasets/luminaops/` remains source of truth; LangSmith is mirror/observation.
- `mirror` never calls retrieve and never requires `--kb-id`.
- `run` requires `--kb-id` (disposable RAG workspace UUID passed to `RetrieverService.retrieve` as `workspace_id`); exit non-zero if missing.
- Missing LangSmith credentials → exit non-zero on `mirror`/`run` (accept `LANGSMITH_API_KEY` or `LANGCHAIN_API_KEY`).
- Phase 1: deterministic evaluators only (coverage / forbidden / hop); no LLM-as-judge; no QA agent scoring.
- Do not wire LangSmith into production retrieval request paths.
- Backend file size ≤ 450 lines; prefer new focused modules over bloating `luminaops.py`.
- Use `uv run --project backend` for pytest and CLI; no `pip`.
- Commits only when the user explicitly asks (omit auto-commit if user rules forbid it; still mark a “Commit” step as optional gate).

## File structure

| Path | Responsibility |
|---|---|
| `backend/app/evaluation/luminaops_metrics.py` | Pure scoring: coverage, forbidden rejection, hop recovery |
| `backend/app/evaluation/luminaops_langsmith.py` | Dataset name, mirror, experiment runner, live target factory, credential helper |
| `backend/app/evaluation/langsmith_client.py` | Add optional `evaluators` to `evaluate()` |
| `backend/app/evaluation/luminaops.py` | Unchanged loaders; may re-export metrics if needed (prefer imports from metrics module) |
| `backend/scripts/evaluate_luminaops.py` | CLI `mirror` \| `run` |
| `backend/pyproject.toml` | Script entry `flae-evaluate-luminaops` |
| `backend/tests/evaluation/test_luminaops_metrics.py` | Unit tests for scorers |
| `backend/tests/evaluation/test_luminaops_langsmith.py` | Mirror payload + runner with fake client |
| `docs/datasets/luminaops/README.md` | Document CLI, `--kb-id`, ingest `source_external_id=doc_id` |

---

### Task 1: Deterministic LuminaOps metrics

**Files:**
- Create: `backend/app/evaluation/luminaops_metrics.py`
- Test: `backend/tests/evaluation/test_luminaops_metrics.py`

**Interfaces:**
- Consumes: gold fields as plain sequences (`supporting_doc_ids`, `forbidden_doc_ids`, `expected_hops` with `.evidence_doc_ids`)
- Produces:
  - `score_document_coverage(*, supporting_doc_ids: Sequence[str], retrieved_doc_ids: Sequence[str], answerable: bool) -> float`
  - `score_forbidden_rejection(*, forbidden_doc_ids: Sequence[str], retrieved_doc_ids: Sequence[str]) -> float`
  - `score_hop_recovery(*, expected_hops: Sequence[object], hop_evidence_doc_ids: Sequence[str] | None) -> float | None`  
    (`None` = skip when hop evidence absent)

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/evaluation/test_luminaops_metrics.py
from app.evaluation.luminaops_metrics import (
    score_document_coverage,
    score_forbidden_rejection,
    score_hop_recovery,
)


def test_document_coverage_answerable_full_and_partial() -> None:
    assert score_document_coverage(
        supporting_doc_ids=("a", "b"),
        retrieved_doc_ids=("a", "b", "c"),
        answerable=True,
    ) == 1.0
    assert score_document_coverage(
        supporting_doc_ids=("a", "b"),
        retrieved_doc_ids=("a",),
        answerable=True,
    ) == 0.5


def test_document_coverage_unanswerable_requires_empty_support() -> None:
    assert score_document_coverage(
        supporting_doc_ids=(),
        retrieved_doc_ids=("x",),
        answerable=False,
    ) == 1.0


def test_forbidden_rejection() -> None:
    assert score_forbidden_rejection(
        forbidden_doc_ids=("bad",),
        retrieved_doc_ids=("good",),
    ) == 1.0
    assert score_forbidden_rejection(
        forbidden_doc_ids=("bad",),
        retrieved_doc_ids=("bad", "good"),
    ) == 0.0


class _Hop:
    def __init__(self, evidence_doc_ids: tuple[str, ...]) -> None:
        self.evidence_doc_ids = evidence_doc_ids


def test_hop_recovery_skips_without_evidence_key() -> None:
    assert score_hop_recovery(expected_hops=(_Hop(("a",)),), hop_evidence_doc_ids=None) is None


def test_hop_recovery_scores_when_evidence_present() -> None:
    assert score_hop_recovery(
        expected_hops=(_Hop(("a", "b")), _Hop(("c",))),
        hop_evidence_doc_ids=("a", "b", "c", "extra"),
    ) == 1.0
    assert score_hop_recovery(
        expected_hops=(_Hop(("a", "b")),),
        hop_evidence_doc_ids=("a",),
    ) == 0.5
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run --project backend pytest backend/tests/evaluation/test_luminaops_metrics.py -q`  
Expected: FAIL (module / functions missing)

- [ ] **Step 3: Implement metrics**

```python
# backend/app/evaluation/luminaops_metrics.py
from __future__ import annotations

from collections.abc import Sequence


def score_document_coverage(
    *,
    supporting_doc_ids: Sequence[str],
    retrieved_doc_ids: Sequence[str],
    answerable: bool,
) -> float:
    if not answerable:
        return 1.0 if len(supporting_doc_ids) == 0 else 0.0
    if not supporting_doc_ids:
        return 1.0
    expected = set(supporting_doc_ids)
    retrieved = set(retrieved_doc_ids)
    return len(expected & retrieved) / len(expected)


def score_forbidden_rejection(
    *,
    forbidden_doc_ids: Sequence[str],
    retrieved_doc_ids: Sequence[str],
) -> float:
    if not forbidden_doc_ids:
        return 1.0
    leaked = set(forbidden_doc_ids) & set(retrieved_doc_ids)
    return 0.0 if leaked else 1.0


def score_hop_recovery(
    *,
    expected_hops: Sequence[object],
    hop_evidence_doc_ids: Sequence[str] | None,
) -> float | None:
    if hop_evidence_doc_ids is None:
        return None
    needed: set[str] = set()
    for hop in expected_hops:
        needed.update(getattr(hop, "evidence_doc_ids"))
    if not needed:
        return 1.0
    got = set(hop_evidence_doc_ids)
    return len(needed & got) / len(needed)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run --project backend pytest backend/tests/evaluation/test_luminaops_metrics.py -q`  
Expected: PASS

- [ ] **Step 5: Commit (optional — only if user asked)**

```bash
git add backend/app/evaluation/luminaops_metrics.py backend/tests/evaluation/test_luminaops_metrics.py
git commit -m "feat(eval): add LuminaOps deterministic retrieval metrics"
```

---

### Task 2: Doc-id normalization + LangSmith mirror/runner (offline, mocked client)

**Files:**
- Create: `backend/app/evaluation/luminaops_langsmith.py`
- Modify: `backend/app/evaluation/langsmith_client.py` (add `evaluators` kwarg)
- Test: `backend/tests/evaluation/test_luminaops_langsmith.py`

**Interfaces:**
- Consumes: `LuminaOpsDataset` / `Question` from `app.evaluation.luminaops`; `LangSmithClientAdapter` protocols; metrics from Task 1
- Produces:
  - `langsmith_credentials_configured(env: Mapping[str, str] | None = None) -> bool`
  - `dataset_langsmith_name(dataset: LuminaOpsDataset) -> str` → `f"{dataset.dataset_name}-{dataset.version}"`
  - `build_doc_id_aliases(dataset: LuminaOpsDataset) -> dict[str, str]` (alias → canonical `doc_id`)
  - `normalize_retrieved_doc_ids(*, aliases: Mapping[str, str], raw_values: Sequence[str]) -> tuple[str, ...]`
  - `normalize_retrieve_results(*, aliases: Mapping[str, str], results: Mapping[str, object], latency_ms: int) -> dict[str, object]`
  - `LuminaOpsDatasetMirror.mirror(dataset) -> LuminaOpsMirrorResult`
  - `LuminaOpsExperimentRunner.run(..., target, evaluators) -> str` (experiment prefix)
  - `build_langsmith_evaluators() -> list` of callables matching LangSmith code-evaluator shape
  - `make_live_target(*, workspace_id: str, aliases: Mapping[str, str], retrieve=...) -> Callable`

**Doc-id contract (must document in README in Task 4):** when ingesting LuminaOps files into the disposable workspace, set `source_external_id` (and prefer document name) to gold `doc_id` (e.g. `handbook`). Normalization also accepts aliases from `doc_id`, `title`, and path stem (`Path(path).stem`).

- [ ] **Step 1: Write failing tests for aliases, normalize, mirror payload**

```python
# backend/tests/evaluation/test_luminaops_langsmith.py
from uuid import UUID

from app.evaluation.luminaops import load_luminaops_dataset
from app.evaluation.luminaops_langsmith import (
    LuminaOpsDatasetMirror,
    build_doc_id_aliases,
    dataset_langsmith_name,
    normalize_retrieve_results,
    normalize_retrieved_doc_ids,
)


class FakeClient:
    def __init__(self) -> None:
        self.datasets: set[str] = set()
        self.examples: list[dict[str, object]] = []

    def has_dataset(self, *, dataset_name: str) -> bool:
        return dataset_name in self.datasets

    def create_dataset(self, dataset_name: str, *, description: str, metadata: dict[str, str]) -> object:
        self.datasets.add(dataset_name)
        return object()

    def upsert_example(
        self,
        *,
        example_id: str,
        dataset_name: str,
        inputs: dict[str, object],
        outputs: dict[str, object],
        metadata: dict[str, str],
    ) -> None:
        UUID(example_id)  # must be valid UUID string
        self.examples.append(
            {
                "example_id": example_id,
                "dataset_name": dataset_name,
                "inputs": inputs,
                "outputs": outputs,
                "metadata": metadata,
            }
        )


def test_dataset_langsmith_name() -> None:
    ds = load_luminaops_dataset()
    assert dataset_langsmith_name(ds) == f"{ds.dataset_name}-{ds.version}"


def test_normalize_doc_ids_via_aliases() -> None:
    ds = load_luminaops_dataset()
    aliases = build_doc_id_aliases(ds)
    assert aliases["handbook"] == "handbook"
    assert aliases[ds.documents[0].title] == ds.documents[0].doc_id
    assert normalize_retrieved_doc_ids(
        aliases=aliases,
        raw_values=("handbook", "unknown-doc"),
    ) == ("handbook",)


def test_normalize_retrieve_results_from_chunks() -> None:
    aliases = {"handbook": "handbook", "Sổ tay": "handbook"}
    out = normalize_retrieve_results(
        aliases=aliases,
        results={
            "top_chunks": [
                {"source_document": "handbook"},
                {"source_document": "Sổ tay"},
            ],
            "top_paths": [],
        },
        latency_ms=12,
    )
    assert out["retrieved_doc_ids"] == ("handbook",)
    assert out["latency_ms"] == 12
    assert "hop_evidence_doc_ids" not in out  # absent → hop evaluator skips


def test_mirror_upserts_all_questions() -> None:
    ds = load_luminaops_dataset()
    client = FakeClient()
    result = LuminaOpsDatasetMirror(client).mirror(ds)
    assert result.dataset_name == dataset_langsmith_name(ds)
    assert result.example_count == len(ds.questions)
    assert len(client.examples) == len(ds.questions)
    sample = client.examples[0]
    assert set(sample["inputs"]) >= {"question", "difficulty", "question_id"}
    assert set(sample["outputs"]) >= {
        "gold_answer",
        "supporting_doc_ids",
        "expected_hops",
        "forbidden_doc_ids",
        "answerable",
    }
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `uv run --project backend pytest backend/tests/evaluation/test_luminaops_langsmith.py -q`  
Expected: FAIL (module missing)

- [ ] **Step 3: Extend `LangSmithClientAdapter.evaluate` to accept evaluators**

In `backend/app/evaluation/langsmith_client.py`, change `evaluate` to:

```python
def evaluate(
    self,
    target: object,
    *,
    data: str,
    experiment_prefix: str,
    metadata: dict[str, str],
    blocking: bool,
    evaluators: list[object] | None = None,
) -> object:
    kwargs: dict[str, object] = {
        "data": data,
        "experiment_prefix": experiment_prefix,
        "metadata": metadata,
        "blocking": blocking,
    }
    if evaluators is not None:
        kwargs["evaluators"] = evaluators
    return self._client.evaluate(cast(LangSmithTarget, target), **kwargs)
```

Keep Company Memory callers working (they omit `evaluators`).

- [ ] **Step 4: Implement `luminaops_langsmith.py`**

Implement (keep file under 450 lines):

- `langsmith_credentials_configured` — true if `LANGSMITH_API_KEY` or `LANGCHAIN_API_KEY` non-empty
- `dataset_langsmith_name`
- `build_doc_id_aliases` / `normalize_retrieved_doc_ids` / `normalize_retrieve_results`
- `LuminaOpsMirrorResult` pydantic model: `dataset_name: str`, `example_count: int`, `experiment_prefix: str` where prefix is `f"{dataset_name}-current"`
- `LuminaOpsDatasetMirror` — same pattern as `LangSmithDatasetMirror` in `company_memory.py`, example UUID5 from `f"{dataset_name}/{question.id}"`, `NAMESPACE_URL`
- `build_langsmith_evaluators()` — three functions `(run, example) -> dict` reading:
  - `example.outputs` / reference outputs for gold
  - `run.outputs` for `retrieved_doc_ids`, optional `hop_evidence_doc_ids`
  - Return keys: `document_coverage`, `forbidden_rejection`, `hop_recovery` (omit hop key or set `None` when skip — follow whatever LangSmith accepts; prefer score dict with `key`/`score`)
- `LuminaOpsExperimentRunner.run(mirror_result, *, target, evaluators) -> str`
- `make_live_target` — returns sync callable `def target(inputs: dict) -> dict` that:
  1. Reads `inputs["question"]`
  2. `asyncio.run(retrieve(workspace_id=workspace_id, query=question))` (injectable `retrieve` for tests)
  3. Times latency
  4. Returns `normalize_retrieve_results(...)`

For LangSmith evaluator signature, prefer:

```python
def document_coverage(run, example) -> dict[str, float | None]:
    outputs = getattr(run, "outputs", None) or {}
    ref = getattr(example, "outputs", None) or {}
    score = score_document_coverage(
        supporting_doc_ids=tuple(ref.get("supporting_doc_ids") or ()),
        retrieved_doc_ids=tuple(outputs.get("retrieved_doc_ids") or ()),
        answerable=bool(ref.get("answerable", True)),
    )
    return {"key": "document_coverage", "score": score}
```

(Adjust attribute access if LangSmith passes dict-like objects in unit tests — wrap with helpers `_as_mapping(obj)`.)

- [ ] **Step 5: Add runner + evaluator unit test with FakeExperimentClient**

```python
def test_experiment_runner_calls_evaluate_with_evaluators() -> None:
    calls: list[dict[str, object]] = []

    class ExpClient:
        def evaluate(self, target, *, data, experiment_prefix, metadata, blocking, evaluators=None):
            calls.append(
                {
                    "data": data,
                    "experiment_prefix": experiment_prefix,
                    "evaluators": evaluators,
                    "blocking": blocking,
                }
            )
            return object()

    from app.evaluation.luminaops_langsmith import (
        LuminaOpsExperimentRunner,
        LuminaOpsMirrorResult,
        build_langsmith_evaluators,
    )

    mirror = LuminaOpsMirrorResult(
        dataset_name="flae-luminaops-2026-09-11.v2",
        example_count=24,
        experiment_prefix="flae-luminaops-2026-09-11.v2-current",
    )
    prefix = LuminaOpsExperimentRunner(ExpClient()).run(
        mirror,
        target=lambda inputs: {"retrieved_doc_ids": [], "latency_ms": 1},
        evaluators=build_langsmith_evaluators(),
    )
    assert prefix == mirror.experiment_prefix
    assert calls[0]["data"] == mirror.dataset_name
    assert calls[0]["evaluators"]
```

- [ ] **Step 6: Run tests**

Run: `uv run --project backend pytest backend/tests/evaluation/test_luminaops_langsmith.py backend/tests/evaluation/test_luminaops_metrics.py -q`  
Expected: PASS

- [ ] **Step 7: Commit (optional)**

```bash
git add backend/app/evaluation/luminaops_langsmith.py backend/app/evaluation/langsmith_client.py backend/tests/evaluation/test_luminaops_langsmith.py
git commit -m "feat(eval): mirror LuminaOps gold to LangSmith and score live runs"
```

---

### Task 3: CLI entrypoint

**Files:**
- Create: `backend/scripts/evaluate_luminaops.py`
- Modify: `backend/pyproject.toml` (`[project.scripts]`)
- Test: extend `backend/tests/evaluation/test_luminaops_langsmith.py` with CLI argv tests (subprocess or call `main(argv)`)

**Interfaces:**
- Consumes: Task 2 APIs; `load_luminaops_dataset`; `RetrieverService.retrieve`
- Produces: exit codes; stdout with dataset name / experiment prefix / hint URL

- [ ] **Step 1: Write failing CLI tests**

```python
import pytest
from scripts.evaluate_luminaops import main


def test_cli_run_requires_kb_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
    assert main(["run"]) == 2  # usage / missing kb-id


def test_cli_mirror_fails_without_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    monkeypatch.delenv("LANGCHAIN_API_KEY", raising=False)
    assert main(["mirror"]) == 1
```

- [ ] **Step 2: Run — expect FAIL** (script missing)

- [ ] **Step 3: Implement CLI**

`backend/scripts/evaluate_luminaops.py`:

```python
"""Internal LuminaOps LangSmith eval CLI.

mirror  — sync gold dataset only (no retrieve, no kb-id)
run     — live retrieve + evaluate (requires --kb-id disposable workspace UUID)
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence

from app.evaluation.langsmith_client import LangSmithClientAdapter
from app.evaluation.luminaops import load_luminaops_dataset
from app.evaluation.luminaops_langsmith import (
    LuminaOpsDatasetMirror,
    LuminaOpsExperimentRunner,
    build_doc_id_aliases,
    build_langsmith_evaluators,
    langsmith_credentials_configured,
    make_live_target,
)
from app.services.knowledge.retrieval.retriever import RetrieverService


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="flae-evaluate-luminaops")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("mirror", help="Sync gold to LangSmith (no retrieve)")

    run_p = sub.add_parser("run", help="Live retrieve + LangSmith experiment")
    run_p.add_argument(
        "--kb-id",
        required=True,
        help="Disposable RAG workspace UUID (RetrieverService workspace_id)",
    )

    args = parser.parse_args(list(argv) if argv is not None else None)

    if not langsmith_credentials_configured():
        print(
            "Missing LANGSMITH_API_KEY or LANGCHAIN_API_KEY",
            file=sys.stderr,
        )
        return 1

    dataset = load_luminaops_dataset()
    client = LangSmithClientAdapter()
    mirror_result = LuminaOpsDatasetMirror(client).mirror(dataset)
    print(f"dataset={mirror_result.dataset_name} examples={mirror_result.example_count}")

    if args.command == "mirror":
        print("mirrored only (no live scores)")
        return 0

    # run
    aliases = build_doc_id_aliases(dataset)
    target = make_live_target(
        workspace_id=args.kb_id,
        aliases=aliases,
        retrieve=RetrieverService.retrieve,
    )
    prefix = LuminaOpsExperimentRunner(client).run(
        mirror_result,
        target=target,
        evaluators=build_langsmith_evaluators(),
    )
    print(f"experiment_prefix={prefix}")
    print("Open LangSmith Experiments UI to inspect scores.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

Notes for implementer:

- `argparse` with `required=True` on `--kb-id` exits with code 2 before `main` returns when invoked via `__main__`; for unit test `main(["run"])`, either catch `SystemExit` or make `--kb-id` not required in argparse and validate manually returning `2`. **Prefer manual validation** so `main(["run"]) == 2` is stable:

```python
run_p.add_argument("--kb-id", default=None, ...)
# after parse:
if args.command == "run" and not args.kb_id:
    print("--kb-id is required for live evaluation", file=sys.stderr)
    return 2
```

- `run` always mirrors first (spec: may mirror when absent; always-mirror is fine and keeps examples fresh).

- [ ] **Step 4: Register script in `backend/pyproject.toml`**

```toml
[project.scripts]
migrate = "scripts.migrate:run_migrations"
application-worker = "workers.application_worker:main"
knowledge-worker = "workers.knowledge_worker:main"
flae-evaluate-luminaops = "scripts.evaluate_luminaops:main"
```

If hatch needs console script that calls `main()` with no args, ensure:

```python
def main(argv: Sequence[str] | None = None) -> int:
    ...

def run() -> None:
    raise SystemExit(main())
```

and point entry at `scripts.evaluate_luminaops:run` **or** keep `main` as entry only if hatch passes no argv (argparse then uses `sys.argv[1:]`). Prefer:

```toml
flae-evaluate-luminaops = "scripts.evaluate_luminaops:run"
```

with `run()` wrapping `SystemExit(main())`.

- [ ] **Step 5: Run unit tests**

Run: `uv run --project backend pytest backend/tests/evaluation/test_luminaops_langsmith.py backend/tests/evaluation/test_luminaops_metrics.py -q`  
Expected: PASS

- [ ] **Step 6: Smoke import CLI help (no network)**

Run: `uv run --project backend flae-evaluate-luminaops --help`  
Expected: shows `mirror` and `run`

- [ ] **Step 7: Commit (optional)**

```bash
git add backend/scripts/evaluate_luminaops.py backend/pyproject.toml backend/tests/evaluation/test_luminaops_langsmith.py
git commit -m "feat(eval): add flae-evaluate-luminaops CLI for mirror and live run"
```

---

### Task 4: Operator docs

**Files:**
- Modify: `docs/datasets/luminaops/README.md`
- Modify (one-line pointer): `docs/superpowers/specs/2026-09-16-luminaops-langsmith-live-eval-design.md` only if CLI details drifted (optional)

- [ ] **Step 1: Append “Live LangSmith eval (internal)” section to README**

Must include:

1. `mirror` vs `run` table (no kb-id vs required kb-id).
2. Prerequisite: disposable workspace; ingest all 12 `documents/*.md` with `source_external_id=<doc_id>` from `gold.json`.
3. Commands:

```bash
uv run --project backend flae-evaluate-luminaops mirror
uv run --project backend flae-evaluate-luminaops run --kb-id <workspace-uuid>
```

4. Env: `LANGSMITH_API_KEY` or `LANGCHAIN_API_KEY`.
5. Where to look: LangSmith dataset `flae-luminaops-<version>`, experiment prefix `…-current`.
6. Safety: do not point `--kb-id` at production customer workspaces.

- [ ] **Step 2: Commit (optional)**

```bash
git add docs/datasets/luminaops/README.md
git commit -m "docs(eval): document LuminaOps LangSmith CLI and ingest contract"
```

---

### Task 5: Verification gate

- [ ] **Step 1: Offline suite**

Run: `uv run --project backend pytest backend/tests/evaluation -q`  
Expected: PASS (including existing LuminaOps schema tests)

- [ ] **Step 2: Manual live checklist (document result in PR / chat; not required to merge if stack unavailable)**

1. Ensure local Postgres RAG DB + embeddings key work.
2. Create disposable workspace; ingest 12 docs with `source_external_id=doc_id`.
3. `flae-evaluate-luminaops run --kb-id …`
4. Open LangSmith → confirm example count = 24 and evaluator columns appear.

- [ ] **Step 3: Spec coverage self-check**

Confirm each spec requirement has a task:

| Spec item | Task |
|---|---|
| Mirror dataset contract | 2 |
| Live target + latency | 2–3 |
| Evaluators coverage/forbidden/hop | 1–2 |
| CLI mirror vs run | 3 |
| Credentials alias | 2–3 |
| No product UI / no prod path | Global + 4 |
| Operator ingest contract | 4 |

---

## Self-review (plan author)

1. **Spec coverage:** Mirror, run+kb-id, evaluators, credentials, docs, no SPA — covered. Phase 2 Company Memory / LLM judge explicitly not in tasks.
2. **Placeholders:** None intentional; hop evaluator skip via `None` is specified.
3. **Type consistency:** `--kb-id` → `workspace_id` string for `RetrieverService.retrieve`; mirror result fields reused by runner and CLI.
4. **Risk called out:** Live scores only meaningful if ingest uses gold `doc_id` as `source_external_id`; README + alias helper mitigate mismatches.
