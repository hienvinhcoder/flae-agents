"""Deterministic Company Memory evaluation fixtures and metrics.

Local fixture scoring is the source of truth. LangSmith mirroring is optional
and deliberately isolated behind a small client protocol.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from enum import StrEnum
from pathlib import Path
from typing import Protocol
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.evaluation.langsmith_client import LangSmithClientAdapter


class EvaluationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class FailureMode(StrEnum):
    pseudo_evidence_rejection = "pseudo_evidence_rejection"
    orphan_path_recovery = "orphan_path_recovery"
    semantic_drift_entity_ambiguity = "semantic_drift_entity_ambiguity"


class ExpectedPath(EvaluationModel):
    entity_ids: tuple[str, ...] = Field(min_length=2, max_length=20)
    assertion_evidence_ids: tuple[str, ...] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_hop_evidence(self) -> ExpectedPath:
        if len(self.assertion_evidence_ids) != len(self.entity_ids) - 1:
            raise ValueError("expected paths require one assertion evidence ID per hop")
        return self


class Distractor(EvaluationModel):
    resource_id: str = Field(min_length=1, max_length=500)
    rationale: str = Field(min_length=1, max_length=2_000)


class DiscoveryMembership(EvaluationModel):
    context_id: str = Field(min_length=1, max_length=500)
    topic_id: str = Field(min_length=1, max_length=500)
    target_kind: str = Field(pattern=r"^(source|document|chunk|entity|assertion)$")
    target_id: str = Field(min_length=1, max_length=500)


class DiscoveryExpectations(EvaluationModel):
    expected_memberships: tuple[DiscoveryMembership, ...] = Field(
        min_length=1, max_length=10_000
    )
    stable_identity_ids: tuple[str, ...] = Field(min_length=1, max_length=1_000)
    baseline_taxonomy_size: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_unique_expectations(self) -> DiscoveryExpectations:
        membership_keys = [_membership_key(item) for item in self.expected_memberships]
        if len(membership_keys) != len(set(membership_keys)):
            raise ValueError("expected discovery memberships must be unique")
        if len(self.stable_identity_ids) != len(set(self.stable_identity_ids)):
            raise ValueError("stable identity IDs must be unique")
        return self


class EvaluationScenario(EvaluationModel):
    scenario_id: str = Field(min_length=1, max_length=100)
    failure_mode: FailureMode
    query: str = Field(min_length=1, max_length=4_000)
    expected_source_ids: tuple[str, ...] = Field(min_length=1, max_length=1_000)
    expected_chunk_ids: tuple[str, ...] = Field(min_length=1, max_length=10_000)
    expected_paths: tuple[ExpectedPath, ...] = Field(min_length=1, max_length=100)
    expected_assertion_evidence_ids: tuple[str, ...] = Field(
        min_length=1, max_length=10_000
    )
    distractors: tuple[Distractor, ...] = Field(min_length=1, max_length=1_000)
    acl_negative_ids: tuple[str, ...] = Field(min_length=1, max_length=1_000)
    discovery: DiscoveryExpectations

    @model_validator(mode="after")
    def validate_fixture_boundaries(self) -> EvaluationScenario:
        _require_unique("expected source IDs", self.expected_source_ids)
        _require_unique("expected chunk IDs", self.expected_chunk_ids)
        _require_unique(
            "expected assertion evidence IDs", self.expected_assertion_evidence_ids
        )
        _require_unique("ACL negative IDs", self.acl_negative_ids)

        expected_resources = set(self.expected_source_ids) | set(self.expected_chunk_ids)
        distractor_ids = {distractor.resource_id for distractor in self.distractors}
        acl_negative_ids = set(self.acl_negative_ids)
        if expected_resources & distractor_ids:
            raise ValueError("distractors cannot also be expected resources")
        if expected_resources & acl_negative_ids:
            raise ValueError("ACL negatives cannot also be expected resources")

        expected_assertions = set(self.expected_assertion_evidence_ids)
        path_assertions = {
            assertion_id
            for path in self.expected_paths
            for assertion_id in path.assertion_evidence_ids
        }
        if not path_assertions <= expected_assertions:
            raise ValueError("path assertions must be expected assertion evidence")
        return self


class EvaluationDataset(EvaluationModel):
    dataset_name: str = Field(min_length=1, max_length=200)
    version: str = Field(min_length=1, max_length=100)
    scenarios: tuple[EvaluationScenario, ...] = Field(min_length=1, max_length=1_000)

    @model_validator(mode="after")
    def validate_unique_scenarios(self) -> EvaluationDataset:
        scenario_ids = [scenario.scenario_id for scenario in self.scenarios]
        if len(scenario_ids) != len(set(scenario_ids)):
            raise ValueError("scenario IDs must be unique")
        return self

    def scenario(self, scenario_id: str) -> EvaluationScenario:
        for scenario in self.scenarios:
            if scenario.scenario_id == scenario_id:
                return scenario
        raise KeyError(f"unknown evaluation scenario: {scenario_id}")


class RetrievalRun(EvaluationModel):
    retrieved_source_ids: tuple[str, ...]
    retrieved_chunk_ids: tuple[str, ...]
    recovered_paths: tuple[ExpectedPath, ...]
    citation_evidence_ids: tuple[str, ...]
    latency_ms: float = Field(ge=0.0)

    @model_validator(mode="after")
    def validate_unique_results(self) -> RetrievalRun:
        _require_unique("retrieved source IDs", self.retrieved_source_ids)
        _require_unique("retrieved chunk IDs", self.retrieved_chunk_ids)
        _require_unique("citation evidence IDs", self.citation_evidence_ids)
        path_keys = [_path_key(path) for path in self.recovered_paths]
        if len(path_keys) != len(set(path_keys)):
            raise ValueError("recovered paths must be unique")
        path_evidence_ids = {
            evidence_id
            for path in self.recovered_paths
            for evidence_id in path.assertion_evidence_ids
        }
        if not path_evidence_ids <= set(self.citation_evidence_ids):
            raise ValueError("recovered path evidence must be returned as citations")
        return self


class RetrievalMetrics(EvaluationModel):
    strict_hit_rate: float = Field(ge=0.0, le=1.0)
    recall: float = Field(ge=0.0, le=1.0)
    precision: float = Field(ge=0.0, le=1.0)
    support_f1: float = Field(ge=0.0, le=1.0)
    supporting_document_coverage: float = Field(ge=0.0, le=1.0)
    path_recovery: float = Field(ge=0.0, le=1.0)
    pseudo_evidence_rejection: float = Field(ge=0.0, le=1.0)
    citation_validity: float = Field(ge=0.0, le=1.0)
    acl_leakage_count: int = Field(ge=0)
    latency_ms: float = Field(ge=0.0)


class DiscoveryRun(EvaluationModel):
    memberships: tuple[DiscoveryMembership, ...]
    surviving_identity_ids: tuple[str, ...]
    taxonomy_change_count: int = Field(ge=0)


class DiscoveryMetrics(EvaluationModel):
    assignment_precision: float = Field(ge=0.0, le=1.0)
    assignment_recall: float = Field(ge=0.0, le=1.0)
    identity_survival: float = Field(ge=0.0, le=1.0)
    taxonomy_churn: float = Field(ge=0.0)


def load_evaluation_dataset(path: Path) -> EvaluationDataset:
    return EvaluationDataset.model_validate_json(path.read_text(encoding="utf-8"))


def score_retrieval(
    scenario: EvaluationScenario, run: RetrievalRun
) -> RetrievalMetrics:
    expected_chunks = set(scenario.expected_chunk_ids)
    retrieved_chunks = set(run.retrieved_chunk_ids)
    chunk_hits = expected_chunks & retrieved_chunks
    recall = _ratio(len(chunk_hits), len(expected_chunks))
    precision = _ratio(len(chunk_hits), len(retrieved_chunks))

    expected_sources = set(scenario.expected_source_ids)
    retrieved_sources = set(run.retrieved_source_ids)
    document_coverage = _ratio(
        len(expected_sources & retrieved_sources), len(expected_sources)
    )

    expected_paths = {_path_key(path) for path in scenario.expected_paths}
    recovered_paths = {_path_key(path) for path in run.recovered_paths}
    path_recovery = _ratio(len(expected_paths & recovered_paths), len(expected_paths))

    distractor_ids = {distractor.resource_id for distractor in scenario.distractors}
    returned_ids = retrieved_sources | retrieved_chunks
    rejected_distractors = distractor_ids - returned_ids
    pseudo_evidence_rejection = _ratio(
        len(rejected_distractors), len(distractor_ids)
    )

    expected_citations = set(scenario.expected_assertion_evidence_ids)
    returned_citations = set(run.citation_evidence_ids)
    citation_validity = _ratio(
        len(expected_citations & returned_citations), len(returned_citations)
    )
    returned_path_ids = {
        path_id
        for path in run.recovered_paths
        for path_id in path.entity_ids + path.assertion_evidence_ids
    }
    leaked_ids = set(scenario.acl_negative_ids) & (
        returned_ids | returned_citations | returned_path_ids
    )
    support_f1 = _f1(precision, recall)
    strict_hit = float(
        recall == 1.0
        and precision == 1.0
        and document_coverage == 1.0
        and path_recovery == 1.0
        and pseudo_evidence_rejection == 1.0
        and citation_validity == 1.0
        and expected_citations <= returned_citations
        and not leaked_ids
    )

    return RetrievalMetrics(
        strict_hit_rate=strict_hit,
        recall=recall,
        precision=precision,
        support_f1=support_f1,
        supporting_document_coverage=document_coverage,
        path_recovery=path_recovery,
        pseudo_evidence_rejection=pseudo_evidence_rejection,
        citation_validity=citation_validity,
        acl_leakage_count=len(leaked_ids),
        latency_ms=run.latency_ms,
    )


def score_discovery(
    expected: DiscoveryExpectations, run: DiscoveryRun
) -> DiscoveryMetrics:
    expected_memberships = {
        _membership_key(membership) for membership in expected.expected_memberships
    }
    actual_memberships = {_membership_key(membership) for membership in run.memberships}
    membership_hits = expected_memberships & actual_memberships
    assignment_precision = _ratio(len(membership_hits), len(actual_memberships))
    assignment_recall = _ratio(len(membership_hits), len(expected_memberships))

    expected_identities = set(expected.stable_identity_ids)
    surviving_identities = set(run.surviving_identity_ids)
    identity_survival = _ratio(
        len(expected_identities & surviving_identities), len(expected_identities)
    )
    taxonomy_churn = run.taxonomy_change_count / expected.baseline_taxonomy_size

    return DiscoveryMetrics(
        assignment_precision=assignment_precision,
        assignment_recall=assignment_recall,
        identity_survival=identity_survival,
        taxonomy_churn=taxonomy_churn,
    )


class DatasetMirrorClient(Protocol):
    def has_dataset(self, *, dataset_name: str) -> bool: ...

    def create_dataset(
        self, dataset_name: str, *, description: str, metadata: dict[str, str]
    ) -> object: ...

    def upsert_example(
        self,
        *,
        example_id: str,
        dataset_name: str,
        inputs: dict[str, object],
        outputs: dict[str, object],
        metadata: dict[str, str],
    ) -> None: ...


class DatasetMirrorResult(EvaluationModel):
    dataset_name: str
    example_count: int = Field(ge=0)
    experiment_names: tuple[str, str, str]


class ExperimentClient(Protocol):
    def evaluate(
        self,
        target: object,
        *,
        data: str,
        experiment_prefix: str,
        metadata: dict[str, str],
        blocking: bool,
    ) -> object: ...


class LangSmithDatasetMirror:
    def __init__(self, client: DatasetMirrorClient) -> None:
        self._client = client

    def mirror(self, dataset: EvaluationDataset) -> DatasetMirrorResult:
        dataset_name = f"{dataset.dataset_name}-{dataset.version}"
        if not self._client.has_dataset(dataset_name=dataset_name):
            self._client.create_dataset(
                dataset_name,
                description=(
                    "Versioned FLAE Company Memory TGS and discovery evaluation fixtures"
                ),
                metadata={"fixture_version": dataset.version},
            )

        for scenario in dataset.scenarios:
            example_id = str(uuid5(NAMESPACE_URL, f"{dataset_name}/{scenario.scenario_id}"))
            self._client.upsert_example(
                example_id=example_id,
                dataset_name=dataset_name,
                inputs={
                    "scenario_id": scenario.scenario_id,
                    "query": scenario.query,
                    "failure_mode": scenario.failure_mode.value,
                },
                outputs=scenario.model_dump(mode="json"),
                metadata={
                    "fixture_version": dataset.version,
                    "scenario_id": scenario.scenario_id,
                },
            )

        return DatasetMirrorResult(
            dataset_name=dataset_name,
            example_count=len(dataset.scenarios),
            experiment_names=(
                f"{dataset_name}-current",
                f"{dataset_name}-without-graph-to-text",
                f"{dataset_name}-without-text-to-graph",
            ),
        )


class LangSmithExperimentRunner:
    def __init__(self, client: ExperimentClient) -> None:
        self._client = client

    def run(
        self,
        dataset: DatasetMirrorResult,
        *,
        current_target: object,
        without_graph_to_text_target: object,
        without_text_to_graph_target: object,
    ) -> tuple[str, str, str]:
        targets = (
            current_target,
            without_graph_to_text_target,
            without_text_to_graph_target,
        )
        variants = ("current", "without_graph_to_text", "without_text_to_graph")
        for target, variant, experiment_name in zip(
            targets, variants, dataset.experiment_names, strict=True
        ):
            self._client.evaluate(
                target,
                data=dataset.dataset_name,
                experiment_prefix=experiment_name,
                metadata={"retriever_variant": variant},
                blocking=True,
            )
        return dataset.experiment_names


def langsmith_is_configured(environment: Mapping[str, str] | None = None) -> bool:
    values = os.environ if environment is None else environment
    return bool(values.get("LANGSMITH_API_KEY"))


def mirror_evaluation_dataset_if_configured(
    path: Path,
    *,
    environment: Mapping[str, str] | None = None,
    client: DatasetMirrorClient | None = None,
) -> DatasetMirrorResult | None:
    if not langsmith_is_configured(environment):
        return None
    mirror_client = LangSmithClientAdapter() if client is None else client
    return LangSmithDatasetMirror(mirror_client).mirror(load_evaluation_dataset(path))


def _require_unique(label: str, values: tuple[str, ...]) -> None:
    if len(values) != len(set(values)):
        raise ValueError(f"{label} must be unique")


def _membership_key(membership: DiscoveryMembership) -> tuple[str, str, str, str]:
    return (
        membership.context_id,
        membership.topic_id,
        membership.target_kind,
        membership.target_id,
    )


def _path_key(path: ExpectedPath) -> tuple[tuple[str, ...], tuple[str, ...]]:
    return path.entity_ids, path.assertion_evidence_ids


def _ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _f1(precision: float, recall: float) -> float:
    if precision + recall == 0.0:
        return 0.0
    return 2 * precision * recall / (precision + recall)
