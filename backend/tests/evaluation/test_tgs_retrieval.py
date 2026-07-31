from pathlib import Path

import pytest
from pydantic import ValidationError

from app.evaluation.company_memory import (
    ExpectedPath,
    RetrievalRun,
    load_evaluation_dataset,
    score_retrieval,
)


DATASET_PATH = Path(__file__).with_name("dataset.json")


def test_dataset_freezes_three_designed_tgs_failure_modes() -> None:
    dataset = load_evaluation_dataset(DATASET_PATH)

    assert dataset.version == "2026-07-29.v1"
    assert {scenario.scenario_id for scenario in dataset.scenarios} == {
        "aurora",
        "helios",
        "atlas",
    }
    assert {scenario.failure_mode for scenario in dataset.scenarios} == {
        "pseudo_evidence_rejection",
        "orphan_path_recovery",
        "semantic_drift_entity_ambiguity",
    }
    for scenario in dataset.scenarios:
        assert scenario.expected_source_ids
        assert scenario.expected_chunk_ids
        assert scenario.expected_paths
        assert scenario.expected_assertion_evidence_ids
        assert scenario.distractors
        assert scenario.acl_negative_ids
        assert scenario.discovery.expected_memberships


def test_full_aurora_run_meets_support_citation_and_rejection_gates() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("aurora")
    run = RetrievalRun(
        retrieved_source_ids=scenario.expected_source_ids,
        retrieved_chunk_ids=scenario.expected_chunk_ids,
        recovered_paths=scenario.expected_paths,
        citation_evidence_ids=scenario.expected_assertion_evidence_ids,
        latency_ms=84.0,
    )

    metrics = score_retrieval(scenario, run)

    assert metrics.strict_hit_rate == 1.0
    assert metrics.recall == 1.0
    assert metrics.precision == 1.0
    assert metrics.support_f1 == 1.0
    assert metrics.supporting_document_coverage == 1.0
    assert metrics.path_recovery == 1.0
    assert metrics.pseudo_evidence_rejection == 1.0
    assert metrics.citation_validity == 1.0
    assert metrics.acl_leakage_count == 0
    assert metrics.latency_ms == 84.0


def test_graph_to_text_ablation_exposes_aurora_pseudo_evidence_failure() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("aurora")
    distractor_id = scenario.distractors[0].resource_id
    ablated = RetrievalRun(
        retrieved_source_ids=scenario.expected_source_ids[:-1],
        retrieved_chunk_ids=scenario.expected_chunk_ids[:-1] + (distractor_id,),
        recovered_paths=scenario.expected_paths[:1],
        citation_evidence_ids=scenario.expected_assertion_evidence_ids,
        latency_ms=61.0,
    )

    metrics = score_retrieval(scenario, ablated)

    assert metrics.strict_hit_rate == 0.0
    assert metrics.supporting_document_coverage < 1.0
    assert metrics.pseudo_evidence_rejection < 1.0
    assert metrics.citation_validity == 1.0


def test_text_to_graph_ablation_loses_helios_orphan_path() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("helios")
    ablated = RetrievalRun(
        retrieved_source_ids=scenario.expected_source_ids,
        retrieved_chunk_ids=scenario.expected_chunk_ids,
        recovered_paths=(),
        citation_evidence_ids=scenario.expected_assertion_evidence_ids,
        latency_ms=50.0,
    )

    metrics = score_retrieval(scenario, ablated)

    assert metrics.recall == 1.0
    assert metrics.path_recovery == 0.0
    assert metrics.strict_hit_rate == 0.0


def test_acl_negative_is_counted_without_entering_support_metrics() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("atlas")
    leaked = RetrievalRun(
        retrieved_source_ids=scenario.expected_source_ids + scenario.acl_negative_ids,
        retrieved_chunk_ids=scenario.expected_chunk_ids,
        recovered_paths=scenario.expected_paths,
        citation_evidence_ids=scenario.expected_assertion_evidence_ids,
        latency_ms=90.0,
    )

    metrics = score_retrieval(scenario, leaked)

    assert metrics.recall == 1.0
    assert metrics.acl_leakage_count == len(scenario.acl_negative_ids)
    assert metrics.strict_hit_rate == 0.0


def test_acl_negative_inside_a_graph_path_fails_the_gate() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("atlas")
    leaked_path = scenario.expected_paths[0].model_copy(
        update={
            "entity_ids": scenario.expected_paths[0].entity_ids
            + (scenario.acl_negative_ids[0],),
            "assertion_evidence_ids": scenario.expected_paths[
                0
            ].assertion_evidence_ids
            + ("assert-atlas-private-link",),
        }
    )
    leaked = RetrievalRun(
        retrieved_source_ids=scenario.expected_source_ids,
        retrieved_chunk_ids=scenario.expected_chunk_ids,
        recovered_paths=scenario.expected_paths + (leaked_path,),
        citation_evidence_ids=scenario.expected_assertion_evidence_ids
        + ("assert-atlas-private-link",),
        latency_ms=90.0,
    )

    metrics = score_retrieval(scenario, leaked)

    assert metrics.acl_leakage_count == 1
    assert metrics.strict_hit_rate == 0.0


def test_dataset_loader_rejects_duplicate_scenario_ids(tmp_path: Path) -> None:
    invalid = DATASET_PATH.read_text().replace('"scenario_id": "helios"', '"scenario_id": "aurora"')
    path = tmp_path / "invalid.json"
    path.write_text(invalid)

    with pytest.raises(ValueError, match="scenario IDs must be unique"):
        load_evaluation_dataset(path)


def test_expected_path_requires_one_assertion_evidence_per_hop() -> None:
    with pytest.raises(ValidationError, match="one assertion evidence ID per hop"):
        ExpectedPath(
            entity_ids=("entity-a", "entity-b", "entity-c"),
            assertion_evidence_ids=("assert-a-b",),
        )


def test_retrieval_run_rejects_duplicate_ranked_ids() -> None:
    with pytest.raises(ValidationError, match="retrieved chunk IDs must be unique"):
        RetrievalRun(
            retrieved_source_ids=("source-a",),
            retrieved_chunk_ids=("chunk-a", "chunk-a"),
            recovered_paths=(),
            citation_evidence_ids=(),
            latency_ms=1.0,
        )


def test_retrieval_run_requires_citations_for_every_recovered_hop() -> None:
    path = ExpectedPath(
        entity_ids=("entity-a", "entity-b"),
        assertion_evidence_ids=("assert-a-b",),
    )

    with pytest.raises(ValidationError, match="path evidence must be returned as citations"):
        RetrievalRun(
            retrieved_source_ids=(),
            retrieved_chunk_ids=(),
            recovered_paths=(path,),
            citation_evidence_ids=(),
            latency_ms=1.0,
        )
