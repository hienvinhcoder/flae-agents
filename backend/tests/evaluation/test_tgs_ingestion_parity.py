import json
from pathlib import Path

import pytest
from pydantic import BaseModel, ConfigDict, ValidationError

from app.schemas.graph_semantics import (
    DemoIngestionProfile,
    EnrichmentStage,
    EntitySemanticEvidence,
    RelationshipSemanticEvidence,
)
from app.services.knowledge.graph.semantic_service import GraphSemanticService


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "tgs_ingestion_parity.json"


class IngestionParityFixture(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    profile: DemoIngestionProfile
    entity_evidence: tuple[EntitySemanticEvidence, ...]
    relationship_evidence: tuple[RelationshipSemanticEvidence, ...]


def _fixture() -> IngestionParityFixture:
    return IngestionParityFixture.model_validate(json.loads(FIXTURE_PATH.read_text()))


def _embed(
    semantic_inputs: tuple[str, ...], dimension: int
) -> tuple[tuple[float, ...], ...]:
    return tuple(
        tuple(
            ((sum(semantic_input.encode()) + index) % 101) / 100
            for index in range(dimension)
        )
        for semantic_input in semantic_inputs
    )


def test_reference_profile_locks_chunking_and_stage_order() -> None:
    profile = _fixture().profile

    assert profile.chunk_size_tokens == 1200
    assert profile.chunk_overlap_tokens == 100
    assert profile.description_threshold == 3
    assert profile.validate_stage_order(
        (
            EnrichmentStage.chunk_embedding,
            EnrichmentStage.first_pass_extraction,
            EnrichmentStage.optional_glean,
            EnrichmentStage.evidence_fusion,
            EnrichmentStage.entity_embedding,
            EnrichmentStage.relationship_embedding,
            EnrichmentStage.graph_publish,
        )
    )
    assert not profile.validate_stage_order(
        (EnrichmentStage.first_pass_extraction, EnrichmentStage.chunk_embedding)
    )


def test_semantic_graph_derives_frequency_degree_mappings_and_inputs() -> None:
    fixture = _fixture()
    profile = fixture.profile
    entities = fixture.entity_evidence
    relationships = fixture.relationship_evidence

    projection = GraphSemanticService(profile, embedder=_embed).build(
        entities, relationships
    )

    by_type = {item.entity_type: item for item in projection.entities}
    edge = by_type["project"]
    analytics = by_type["dataset"]
    assert edge.frequency == 2
    assert edge.degree == 2
    assert edge.semantic_input == f"{edge.canonical_name}\n{edge.description}"
    assert analytics.frequency == 1
    assert analytics.degree == 2
    assert len(projection.relationships) == 2
    assert {item.polarity.value for item in projection.relationships} == {
        "affirmed",
        "negated",
    }
    assert all(item.degree == 4 for item in projection.relationships)
    assert {item.chunk_id for item in projection.mappings} == {
        "chunk-edge-1",
        "chunk-edge-2",
        "chunk-analytics-1",
    }
    assert projection.is_complete


def test_rebuild_uses_only_active_evidence_without_retry_inflation() -> None:
    fixture = _fixture()
    service = GraphSemanticService(fixture.profile, embedder=_embed)
    entities = fixture.entity_evidence
    relationships = fixture.relationship_evidence

    first = service.build(entities + entities, relationships + relationships)
    after_delete = service.build(entities[:-1], ())
    replay = service.build(tuple(reversed(entities + entities)), relationships * 2)

    assert first.projection_checksum == replay.projection_checksum
    assert max(item.frequency for item in first.entities) == 2
    assert len(after_delete.entities) == 1
    assert after_delete.relationships == ()
    assert after_delete.projection_checksum != first.projection_checksum


def test_relationship_requires_exact_source_backing() -> None:
    item = _fixture().relationship_evidence[0].model_dump(mode="json")
    item["chunk_id"] = ""

    with pytest.raises(ValidationError):
        RelationshipSemanticEvidence.model_validate(item)


def test_description_threshold_uses_bounded_summarizer_input() -> None:
    fixture = _fixture()
    profile = fixture.profile
    base = fixture.entity_evidence[0]
    evidence = tuple(
        base.model_copy(
            update={
                "observation_id": base.observation_id.__class__(int=index + 1),
                "chunk_id": f"chunk-summary-{index}",
                "description": f"Description {index}",
            }
        )
        for index in range(4)
    )
    calls: list[tuple[str, tuple[str, ...]]] = []

    def summarize(name: str, descriptions: tuple[str, ...]) -> str:
        calls.append((name, descriptions))
        return "Bounded evidence summary."

    projection = GraphSemanticService(
        profile, embedder=_embed, summarizer=summarize
    ).build(evidence, ())

    assert calls == [
        (
            "Atlas",
            ("Description 0", "Description 1", "Description 2", "Description 3"),
        )
    ]
    assert projection.entities[0].description == "Bounded evidence summary."
    assert projection.entities[0].frequency == 4


def test_semantic_inputs_are_embedded_in_one_bounded_batch() -> None:
    fixture = _fixture()
    calls: list[tuple[str, ...]] = []

    def embed(
        semantic_inputs: tuple[str, ...], dimension: int
    ) -> tuple[tuple[float, ...], ...]:
        calls.append(semantic_inputs)
        return _embed(semantic_inputs, dimension)

    projection = GraphSemanticService(
        fixture.profile, embedder=embed
    ).build(fixture.entity_evidence, fixture.relationship_evidence)

    assert len(calls) == 1
    assert len(calls[0]) == len(projection.entities) + len(projection.relationships)
