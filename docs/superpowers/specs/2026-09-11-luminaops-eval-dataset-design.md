# LuminaOps evaluation dataset

## Status

Accepted for dataset authoring. LangSmith is an optional experiment mirror, not the source of truth.

## Objective

Evaluate FLAE ingestion, semantic chunking, fusion, and TGS retrieval on a synthetic operating-company corpus. `demo-app` is a TGS logic reference only. Offline gold in `docs/datasets/luminaops/` is the reproducible source of truth.

## Two layers

1. **TGS logic parity** — FLAE algorithms match TGS (`demo-app`): chunk params, fusion threshold, Graph-to-Text, Text-to-Graph, scoring. Fixtures such as `tgs_ingestion_parity.json`. Not scored by LuminaOps answers.
2. **FLAE quality** — After ingesting LuminaOps documents, retrieval and answers match gold evidence. This dataset.

## Corpus

LuminaOps: Vietnamese B2B WMS SaaS (ShelfFlow, DockSync). Twelve markdown sources mimicking Drive, Notion, Slack, each long enough for TGS chunking (`fixed_size=1200`, `semantic_target=900`). Intentional traps: person vs customer named “Khang”, handbook vs June 2026 leadership/HQ update, a false topic summary. ADR-014 has an oversized `##` section; the Khang Minh contract has a dock table above `semantic_hard_limit`.

## Question ladder

| Level | Count | Intent |
|---|---|---|
| L1 extractive | 6 | One current span |
| L2 compare | 6 | Two sources or two entities |
| L3 multi-hop | 8 | Path across documents |
| L4 trap | 4 | Unanswerable, stale fact, distractor |

Gold fields: `gold_answer`, `answerable`, `supporting_doc_ids`, `supporting_spans`, `expected_entities`, `expected_hops`, `forbidden_doc_ids`.

## LangSmith

Optional mirror via existing `LangSmithClientAdapter` + `evaluate()`. Code evaluators for document coverage, forbidden-doc rejection, hop recovery. LLM-as-judge only for answer wording. LangSmith must not change local scores or production retrieval. See dataset README.

## Out of scope

- Committing `demo-app/`
- Replacing Aurora/Helios/Atlas
- Live Gemini as gold
- LangSmith online evaluators on production traces (later, separate)
