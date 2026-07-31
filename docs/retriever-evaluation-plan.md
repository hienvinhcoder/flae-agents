# Company Memory Retrieval Evaluation

The versioned offline fixture at `backend/tests/evaluation/dataset.json` is the
reproducible source of truth for Company Memory retrieval and discovery
evaluation. Hosted LangSmith datasets and experiments mirror this fixture; they
do not replace it and are not on the runtime correctness path.

## Dataset version

Current fixture: `2026-07-29.v1`

The fixture contains three intentionally different failure modes:

| Scenario | Designed failure | Required mechanism |
|---|---|---|
| Aurora | A derived summary or weakly related release note looks like evidence | Graph-to-Text voting plus evidence citation validation |
| Helios | A text hit contains an entity whose bridge is pruned from selected graph paths | Text-to-Graph recovery from visited memory |
| Atlas | Two projects share the same name and ADR number | Evidence-scoped entity identity and directed path provenance |

Every scenario freezes expected source IDs, chunk IDs, entity paths, assertion
evidence IDs, distractor rationale, ACL-negative IDs, and labeled discovery
memberships. Source membership is deliberately many-to-many in each scenario.

## Metric semantics

- Strict Hit Rate is `1` only when all expected chunks, sources, paths, and
  assertion citations are present, no distractor is returned, and ACL leakage
  is zero.
- Recall and precision operate on supporting chunk IDs. Support F1 is their
  harmonic mean.
- Supporting-document coverage measures expected source coverage separately
  from chunk ranking.
- Path recovery requires both the expected directed entity sequence and the
  expected hop assertion IDs. Every consecutive entity pair has exactly one
  assertion evidence ID, and every recovered hop evidence ID must also appear
  in the returned citation set.
- Pseudo-evidence rejection is the fraction of labeled distractors absent from
  returned source/chunk IDs.
- Citation validity is the fraction of returned assertion citations that are
  labeled supporting evidence. Missing citations still fail Strict Hit Rate.
- ACL leakage is a count, not a soft score. Any value above zero fails the gate.
- Latency is recorded in milliseconds without transformation.
- Discovery assignment precision/recall compare exact
  `(context, topic, target_kind, target)` memberships.
- Identity survival measures stable context/topic IDs across replay or small
  updates. Taxonomy churn is the number of identity-changing events divided by
  the baseline taxonomy size.

## Frozen quality gates

The deterministic release gates for all three scenarios are:

| Metric | Gate |
|---|---:|
| Strict Hit Rate | `1.0` |
| Supporting-document coverage | `1.0` |
| Path recovery | `1.0` |
| Pseudo-evidence rejection | `1.0` |
| Citation validity | `1.0` |
| ACL leakage count | `0` |
| Discovery assignment precision/recall | `1.0` on frozen fixture |
| Identity survival | `1.0` on replay/reordered fixture |

The production latency ceiling is intentionally not inferred from test doubles.
Checkpoint A must freeze it from measured current-retriever runs on a disposable
fixture database, reporting p50 and p95 separately. Later implementation must
not weaken the quality or ACL gates to meet latency.

## Offline workflow

Run:

```bash
uv run --project backend pytest backend/tests/evaluation -q
```

The suite validates the dataset schema, scores a conformant result, demonstrates
the Aurora Graph-to-Text and Helios Text-to-Graph ablation failures, measures
Atlas ACL leakage, and verifies discovery stability. It does not call external
models, databases, LangSmith, or production services.

## Optional LangSmith workflow

When `LANGSMITH_API_KEY` is configured, call
`mirror_evaluation_dataset_if_configured` (or construct
`LangSmithClientAdapter` directly), then run
`LangSmithExperimentRunner` with three explicitly configured targets:

1. current retriever;
2. retriever with Graph-to-Text disabled;
3. retriever with Text-to-Graph disabled.

Dataset examples use deterministic UUIDs derived from dataset version and
scenario ID, so repeated mirroring updates the same examples. Mirrored outputs
retain the full offline labels, including distractors, ACL negatives, and
discovery expectations. Experiment names are versioned as:

- `flae-company-memory-<version>-current`;
- `flae-company-memory-<version>-without-graph-to-text`;
- `flae-company-memory-<version>-without-text-to-graph`.

LangSmith failures must fail the optional evaluation job visibly but never
change local scores or production retrieval behavior.

## Versioning rules

Changing expected evidence, membership labels, distractor rationale, or metric
semantics requires a new dataset version. Reordering JSON without changing
meaning does not. Historical fixture versions remain available for regression
comparison.
