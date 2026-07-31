from uuid import uuid4

from app.schemas.graph_enrichment import (
    CanonicalEntityVersion,
    EntityResolutionProjection,
    ProjectionAssertion,
    ResolutionAssignment,
)
from app.services.knowalge_base.graph_projection_service import (
    GraphProjectionService,
)


def _resolution():
    subject_observation = uuid4()
    object_observation = uuid4()
    subject_entity = uuid4()
    object_entity = uuid4()
    revision_id = uuid4()
    entities = (
        CanonicalEntityVersion(
            canonical_entity_id=subject_entity,
            canonical_name="Atlas Edge",
            entity_type="project",
            confidence=0.98,
        ),
        CanonicalEntityVersion(
            canonical_entity_id=object_entity,
            canonical_name="Minh Stream",
            entity_type="library",
            confidence=0.97,
        ),
    )
    assignments = (
        ResolutionAssignment(
            observation_id=subject_observation,
            revision_id=revision_id,
            canonical_entity_id=subject_entity,
            confidence=0.98,
            decision="created",
            rationale="fixture",
        ),
        ResolutionAssignment(
            observation_id=object_observation,
            revision_id=revision_id,
            canonical_entity_id=object_entity,
            confidence=0.97,
            decision="created",
            rationale="fixture",
        ),
    )
    resolution = EntityResolutionProjection(
        resolution_run_id=uuid4(),
        resolver_version="resolver-v1",
        evidence_checksum="sha256:" + "a" * 64,
        mapping_checksum="sha256:" + "b" * 64,
        entities=entities,
        assignments=assignments,
        lineage=(),
    )
    return resolution, revision_id, subject_observation, object_observation


def _assertions():
    resolution, revision_id, subject_observation, object_observation = _resolution()
    first = ProjectionAssertion(
        assertion_id=uuid4(),
        revision_id=revision_id,
        chunk_id="chk-atlas-1",
        subject_observation_id=subject_observation,
        predicate="uses",
        object_observation_id=object_observation,
        polarity="affirmed",
        confidence=0.96,
    )
    second = first.model_copy(
        update={"assertion_id": uuid4(), "chunk_id": "chk-atlas-2"}
    )
    return resolution, (first, second)


def test_projection_preserves_direction_predicate_and_unique_frequency() -> None:
    resolution, assertions = _assertions()
    projection = GraphProjectionService.project(
        resolution, assertions, projection_version="projection-v1"
    )

    relationship = projection.relationships[0]
    assignment_by_observation = {
        item.observation_id: item.canonical_entity_id
        for item in resolution.assignments
    }
    assert relationship.subject_entity_id == assignment_by_observation[
        assertions[0].subject_observation_id
    ]
    assert relationship.object_entity_id == assignment_by_observation[
        assertions[0].object_observation_id
    ]
    assert relationship.predicate == "uses"
    assert relationship.frequency == 2
    assert set(relationship.assertion_ids) == {
        assertions[0].assertion_id,
        assertions[1].assertion_id,
    }


def test_projection_rebuild_and_retry_do_not_inflate_aggregates() -> None:
    resolution, assertions = _assertions()
    duplicated = assertions + (assertions[0], assertions[1])

    first = GraphProjectionService.project(
        resolution, duplicated, projection_version="projection-v1"
    )
    second = GraphProjectionService.project(
        resolution, tuple(reversed(duplicated)), projection_version="projection-v1"
    )

    assert first.projection_checksum == second.projection_checksum
    assert first.projection_id == second.projection_id
    assert first.relationships[0].frequency == 2


def test_bidirectional_mapping_queries_return_same_provenance_rows() -> None:
    resolution, assertions = _assertions()
    projection = GraphProjectionService.project(
        resolution, assertions, projection_version="projection-v1"
    )
    relationship = projection.relationships[0]

    by_target = GraphProjectionService.mappings_for_target(
        projection,
        target_kind="relationship",
        target_id=relationship.relationship_id,
    )
    by_chunks = tuple(
        row
        for chunk_id in relationship.chunk_ids
        for row in GraphProjectionService.mappings_for_chunk(projection, chunk_id)
        if row.target_kind == "relationship"
        and row.target_id == relationship.relationship_id
    )

    assert set(by_target) == set(by_chunks)
    assert {row.assertion_id for row in by_target} == set(
        relationship.assertion_ids
    )
    assert all(row.revision_id == assertions[0].revision_id for row in by_target)
