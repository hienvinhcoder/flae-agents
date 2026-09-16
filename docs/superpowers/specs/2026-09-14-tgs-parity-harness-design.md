# TGS parity harness (FLAE vs demo-app)

## Status

Accepted intent; awaiting implementation plan after this spec review.

## Objective

Provide an **offline, no-LLM, no-DB** CLI that compares FLAE TGS algorithm stages against the local reference implementation in `demo-app/examples-app`, so engineers can confirm the port is correct for:

1. Chunking  
2. Fusion merge (deterministic branch)  
3. Retrieve scoring (Graph-to-Text / Text-to-Graph / ranking)

This is **algorithm parity**, not answer-quality evaluation. LuminaOps gold and LangSmith remain separate.

## Confirmed intent

| Field | Value |
|---|---|
| Outcome | Stage + final retrieve parity report |
| Corpus | Small fixed set (1–3 docs) |
| Runtime | Offline in-process |
| LLM | Out of scope; canned entity/graph fixtures |
| Success | Same input → matching intermediates and ranked retrieve after normalize |
| Out of scope | Live DB/API, extraction LLM, LuminaOps answer scoring, committing `demo-app` |

## Architecture

```
docs/datasets/tgs-parity/
  documents/                 # 3 markdown files (from LuminaOps)
  fusion_cases.json
  retrieve_cases.json

backend/app/evaluation/tgs_parity/
  adapters.py                # call FLAE + demo-app entry points
  normalize.py               # text / id normalization
  diff.py                    # structured stage diffs
  report.py                  # stdout + JSON report shape

backend/scripts/compare_tgs_parity.py
  CLI: --stage all|chunk|fuse|retrieve
       --demo-app PATH
       --report PATH
```

`demo-app/` stays gitignored local reference. The harness resolves it via `--demo-app` or default relative path and fails clearly if missing.

## Components

### Chunk stage

- **FLAE:** `ChunkingService.chunk_text_fixed` / `chunk_text_semantic` (or `chunk_document` with explicit strategy/knobs).
- **demo-app:** `chunks.chunk_text_fixed_size` / `chunk_text_semantic` / `chunk_dispatcher` via `sys.path` into `examples-app`.
- **Knobs (must match):** fixed `1200/100`; semantic `900/150`, `pre_context_limit=50`, `hard_limit=500`.
- **Compare:** ordered list of `{token_count, text}` after normalize.
- **Known normalize:** strip `\ufffd`; collapse trailing whitespace differences already known between FLAE and demo fixed decode. Content mismatches still fail.

### Fuse stage

- **Input:** `fusion_cases.json` groups with `≤3` unique descriptions (deterministic merge) and at least one `>3` case that only asserts `would_summarize=true` (no LLM call).
- **FLAE:** deterministic merge path used by incremental fusion (threshold from `RAG_SUMMARIZATION_THRESHOLD`, default 3), invoked without DB — adapter wraps pure merge helpers or a thin extracted function if needed.
- **demo-app:** `_merge_and_summarize_group` (or equivalent) with `threshold=3`, empty existing store, no LLM branch for `≤3`.
- **Compare:** merged description / keep-vs-merge identity for `≤3`; summarize flag only for `>3`.

### Retrieve stage

Use **current** FLAE code (`retrieval/helpers.py` + `RetrieverService` as orchestrator). Do **not** restore deleted `tgs_retriever.py` / models from git history. If files are messy, thin-refactor only what is needed for offline purity and scale up later.

| Slice | Scope |
|---|---|
| **v1** | `filter_redundant_paths`, `score_paths_component_based`, `score_chunks` with fixture embeddings/maps vs demo-app equivalent formulas |
| **v2 (later)** | Pure in-memory beam given a neighbor map (extract from `_graph_pathfinding_beam_search`) |
| **v3 (later)** | Offline seeds → paths → votes → ranked chunks without SQL |

- **Input (v1):** `retrieve_cases.json` with query embedding, entity/edge/chunk maps, paths or graph-vote counters, expected ordered ids/scores.
- **Do not** call demo `PathSBERetriever.search` or FLAE `RetrieverService.retrieve` (DB + embed + LLM).
- **Report labels:** `mode=flae_helpers_vs_demo`, `slice=v1_scoring`.
- **Compare (v1):** ordered paths / chunk ids (scores within tolerance).

## Corpus

Default documents under `docs/datasets/tgs-parity/documents/` (copied or linked from LuminaOps, not a second source of truth for QA gold):

| File | Why |
|---|---|
| `04-adr-014-pgvector.md` | oversized `##` section probe |
| `05-contract-khang-minh.md` | `hard_limit` / no-overlap probe |
| `01-handbook.md` | normal multi-heading baseline |

Reuse knobs already asserted in LuminaOps `gold.json` / `test_luminaops_dataset.py`.

## CLI behavior

```bash
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage all
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage chunk --demo-app ../demo-app/examples-app
uv run --project backend python backend/scripts/compare_tgs_parity.py --stage all --report /tmp/tgs-parity.json
```

- Prints a per-case pass/fail table.
- Writes optional JSON: `{ "stages": [ { "stage", "case_id", "pass", "diff_summary" } ], "ok": bool }`.
- Exit code `0` only if all selected stages pass.
- Never reads production DB URLs for algorithm work; never calls Gemini even if keys are set.

## Error handling

| Condition | Behavior |
|---|---|
| demo-app path missing | Hard fail for **chunk** stage; fuse/retrieve v1 can run without demo-app |
| demo import failure | Fail that stage; surface ImportError |
| Fixture schema invalid | Hard fail before running cases |

## Testing (minimal for v1)

- Script is the primary UX.
- Thin pytest for helpers + fuse/retrieve fixtures.
- Delete orphaned `test_tgs_retriever.py` (imports removed modules); do not resurrect deleted retriever code to make it pass.

## Explicit non-goals

- Committing `demo-app/` into the repo
- Live ingest into FLAE `rag_db` or demo Postgres
- LLM extraction parity
- Replacing LuminaOps / Company Memory evaluation
- Byte-identical embeddings or vector search

## Success criteria

1. Running `--stage fuse` and `--stage retrieve` exits 0 without demo-app or network.
2. Running `--stage chunk` / `--stage all` with local demo-app exits 0 when FLAE matches demo chunking.
3. Intentionally changing FLAE chunk overlap, fusion threshold, or a scoring weight makes the matching stage fail with a clear `diff_summary`.
4. No network/DB/LLM calls required for fuse+retrieve green runs; no restored deleted retriever modules.
