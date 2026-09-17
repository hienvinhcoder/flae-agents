# LuminaOps LangSmith live evaluation (internal)

## Status

Accepted for implementation planning. Complements
[`2026-09-11-luminaops-eval-dataset-design.md`](./2026-09-11-luminaops-eval-dataset-design.md):
that doc owns the offline gold corpus; this doc owns the **live runner + LangSmith
observation surface** for internal engineering.

## Intent

Internal eng can:

1. Mirror LuminaOps gold into a LangSmith dataset.
2. Run a live FLAE retrieval target against a disposable knowledge base that
   already ingested the 12 LuminaOps documents.
3. Open LangSmith experiment UI to inspect per-example scores and compare runs.
4. Use a one-shot CLI for regression, and still create/adjust experiments in the
   LangSmith UI when needed.

Not for customers. Not a product UI inside the FLAE SPA.

## Approach

**CLI thin wrapper around existing LangSmith SDK adapter** (Approach 1).

- Reuse `LangSmithClientAdapter` and the Company Memory mirror/evaluate patterns
  in `app.evaluation.company_memory`, specialized for LuminaOps.
- Observation UI = LangSmith hosted experiments (no FLAE frontend work).
- Deterministic code evaluators only in phase 1.

Rejected for phase 1: Temporal eval workflow; pytest-as-runner that pushes
LangSmith as a side effect (harder to operate as a deliberate one-shot).

## Architecture

```
docs/datasets/luminaops/gold.json
        │
        ▼
LuminaOpsDatasetMirror ──► LangSmith dataset  flae-luminaops-<version>
        │
        ▼
CLI: evaluate-luminaops run --kb-id …
        │
        ▼
Live target: RetrieverService.retrieve(question)
        │
        ▼
Code evaluators (coverage / hops / forbidden)
        │
        ▼
LangSmith experiment  flae-luminaops-<version>-current
```

Offline pytest on fixture schema remains the local source of truth for gold
validity. LangSmith never changes production retrieval behavior.

## Components

| Unit | Responsibility |
|---|---|
| `app.evaluation.luminaops` (extend) | Load gold; deterministic scoring helpers for doc coverage, hop recovery, forbidden rejection |
| `LuminaOpsLangSmithMirror` | Upsert examples with stable UUIDs from `dataset_name/question_id` |
| `LuminaOpsLiveTarget` | Callable/async target: input question → retrieve → normalize `retrieved_doc_ids` (and hop evidence if the retriever returns it) |
| `LuminaOpsExperimentRunner` | `client.evaluate(target, data=…, experiment_prefix=…, evaluators=…)` |
| CLI entrypoint | `mirror` \| `run` subcommands; print dataset name + experiment URL/prefix |
| Corpus setup (optional flag or separate command) | Documented procedure to ingest 12 markdown files into a disposable KB; phase 1 may require `--kb-id` of an already-ingested KB rather than automating full Temporal ingest |

## LangSmith dataset contract

- **Dataset name:** `flae-luminaops-<version>` (from `gold.json` `version`).
- **Example id:** deterministic UUID5 from `f"{dataset_name}/{question.id}"`.
- **inputs:** `{ "question": str, "difficulty": str, "question_id": str }`
- **outputs (reference):** `{ "gold_answer", "supporting_doc_ids", "expected_hops", "forbidden_doc_ids", "answerable" }`
- **metadata:** `{ "fixture_version", "question_id", "difficulty" }`

## Live target contract

- Requires a real `RetrieverService` bound to an authorization context and
  `kb_id` that contains the ingested LuminaOps corpus.
- For each example: call retrieve with `inputs["question"]`.
- Return a dict at least: `{ "retrieved_doc_ids": [...], "latency_ms": int }`.
  Include hop/path fields only when the live stack exposes them; hop evaluator
  skips or scores zero when absent rather than inventing graph structure.
- Phase 1 does **not** score answer text or run the QA agent end-to-end.

## Evaluators (phase 1, deterministic)

| Evaluator | Pass condition |
|---|---|
| Document coverage | All `supporting_doc_ids` ⊆ `retrieved_doc_ids` (answerable questions); empty support for unanswerable |
| Forbidden-doc rejection | Intersection of `forbidden_doc_ids` and `retrieved_doc_ids` is empty |
| Hop recovery | When `expected_hops` non-empty and target returns hop evidence: expected hop evidence docs covered; otherwise record `null` / skip without failing the whole experiment wiring |

LLM-as-judge for answer faithfulness is **out of scope** for phase 1.

## CLI

Two subcommands with different jobs. **Only `run` scores the live retriever.**
`mirror` never calls retrieve and never needs a `kb-id`.

| Command | Needs `kb-id`? | What it does |
|---|---|---|
| `mirror` | No | Sync gold only: upsert questions + reference labels into LangSmith dataset `flae-luminaops-<version>`. Use to refresh the hosted dataset after gold edits, or before opening LangSmith to hand-build an experiment. **Does not evaluate accuracy.** |
| `run` | **Yes** | Live evaluate: retrieve against the given KB, run code evaluators, write a LangSmith experiment. Without a disposable KB that already ingested the 12 LuminaOps docs, live scoring is impossible. |

```bash
# Sync gold → LangSmith dataset only (no retrieve, no scores)
uv run --project backend flae-evaluate-luminaops mirror

# Live experiment (KB already ingested with LuminaOps corpus)
uv run --project backend flae-evaluate-luminaops run --kb-id <uuid>
```

Typical flow:

1. Ingest the 12 LuminaOps markdown files into a disposable eval KB → obtain `kb-id`.
2. Optionally `mirror` if the LangSmith dataset is missing or gold changed.
3. `run --kb-id <uuid>` to score live retrieval and open the experiment in LangSmith.

`run` may call mirror first when the dataset is absent (convenience), but `mirror`
alone must remain a no-retrieve sync.

Behavior:

- Missing LangSmith credentials → exit non-zero with a clear message (do not
  silently skip on `run`; `mirror`/`run` are explicit cloud ops).
- `run` without `--kb-id` → exit non-zero; do not fall back to offline-only scoring.
- Credential env: prefer `LANGSMITH_API_KEY`; also accept `LANGCHAIN_API_KEY` if
  that is what local `.env` already uses, and document the alias in README.
- On success, print dataset name, experiment prefix, and a LangSmith project URL
  when derivable from env (`LANGCHAIN_ENDPOINT` / workspace).

## Environment and safety

- Internal-only. No public API route, no SPA page.
- Must not run against production customer KBs by default; docs must state
  disposable / eval tenant + KB.
- LangSmith failures fail the CLI visibly; they must not alter local offline
  pytest scores or production retrieve paths.

## Testing

- Unit tests for mirror payload shape and deterministic evaluators (no network).
- Adapter protocol mocked like Company Memory tests.
- Optional `@pytest.mark.integration` live run is **not** required to merge phase 1
  if local stacks differ; document manual verification steps instead.

## Phase 2 (explicitly later)

- Company Memory live + three ablation experiments (current / no G2T / no T2G).
- Optional LLM-as-judge on answer faithfulness vs supporting spans.
- Optional `--setup-corpus` that drives Temporal ingest of the 12 docs.

## Out of scope (phase 1)

- FLAE product / admin UI
- Wiring LangSmith into production request paths
- Replacing offline gold as source of truth
- Scoring the full QA agent response
- Automating production-like multi-tenant ACL cases beyond what gold already labels via `forbidden_doc_ids`
