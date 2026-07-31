from uuid import uuid4

from app.schemas.graph_enrichment import ResolutionObservation
from app.services.knowalge_base.entity_resolution_service import (
    EntityResolutionService,
)


def _observation(
    name: str,
    *,
    external_ids: tuple[str, ...] = (),
    attributes: tuple[tuple[str, str], ...] = (),
    confidence: float = 0.95,
) -> ResolutionObservation:
    return ResolutionObservation(
        observation_id=uuid4(),
        revision_id=uuid4(),
        chunk_id=f"chk-{uuid4()}",
        raw_mention=name,
        normalized_mention=name.casefold(),
        proposed_type="project",
        confidence=confidence,
        external_ids=external_ids,
        disambiguation_attributes=tuple(
            {"name": key, "value": value} for key, value in attributes
        ),
    )


def test_atlas_same_name_collision_stays_distinct() -> None:
    edge = _observation("Atlas", external_ids=("project:atlas-edge",))
    analytics = _observation(
        "Atlas", external_ids=("project:atlas-analytics",)
    )

    projection = EntityResolutionService.resolve_observations(
        (edge, analytics), resolver_version="resolver-v1"
    )

    assignments = {item.observation_id: item for item in projection.assignments}
    assert assignments[edge.observation_id].canonical_entity_id is not None
    assert assignments[analytics.observation_id].canonical_entity_id is not None
    assert (
        assignments[edge.observation_id].canonical_entity_id
        != assignments[analytics.observation_id].canonical_entity_id
    )


def test_unidentified_bridge_cannot_merge_conflicting_external_ids() -> None:
    shared_context = (("portfolio", "platform"),)
    edge = _observation(
        "Atlas",
        external_ids=("project:atlas-edge",),
        attributes=shared_context,
    )
    bridge = _observation("Atlas", attributes=shared_context)
    analytics = _observation(
        "Atlas",
        external_ids=("project:atlas-analytics",),
        attributes=shared_context,
    )

    projection = EntityResolutionService.resolve_observations(
        (edge, bridge, analytics), resolver_version="resolver-v1"
    )
    assignments = {item.observation_id: item for item in projection.assignments}

    assert (
        assignments[edge.observation_id].canonical_entity_id
        != assignments[analytics.observation_id].canonical_entity_id
    )


def test_external_id_aliases_merge_and_replay_checksum_is_stable() -> None:
    english = _observation("Minh Stream", external_ids=("pkg:minh-stream",))
    vietnamese = _observation("Luồng Minh", external_ids=("pkg:minh-stream",))

    first = EntityResolutionService.resolve_observations(
        (english, vietnamese), resolver_version="resolver-v1"
    )
    second = EntityResolutionService.resolve_observations(
        (vietnamese, english), resolver_version="resolver-v1"
    )

    assert first.mapping_checksum == second.mapping_checksum
    assert first.evidence_checksum == second.evidence_checksum
    assert first.resolution_run_id == second.resolution_run_id
    assert len(first.entities) == 1
    assert len({item.canonical_entity_id for item in first.assignments}) == 1


def test_name_with_shared_context_can_merge_but_low_confidence_is_unresolved() -> None:
    first = _observation(
        "Orion", attributes=(("repository", "orion-core"),)
    )
    second = _observation(
        "ORION", attributes=(("repository", "orion-core"),)
    )
    uncertain = _observation(
        "Orion",
        attributes=(("repository", "orion-core"),),
        confidence=0.4,
    )

    projection = EntityResolutionService.resolve_observations(
        (first, second, uncertain), resolver_version="resolver-v1"
    )
    assignments = {item.observation_id: item for item in projection.assignments}

    assert (
        assignments[first.observation_id].canonical_entity_id
        == assignments[second.observation_id].canonical_entity_id
    )
    assert assignments[uncertain.observation_id].canonical_entity_id is None
    assert assignments[uncertain.observation_id].decision == "unresolved"


def test_lineage_records_merge_and_split_without_rewriting_prior_projection() -> None:
    first = _observation("Atlas Edge", external_ids=("project:atlas",))
    second = _observation("Atlas Analytics", external_ids=("project:atlas",))
    merged = EntityResolutionService.resolve_observations(
        (first, second), resolver_version="resolver-v1"
    )

    split_first = first.model_copy(update={"external_ids": ("project:edge",)})
    split_second = second.model_copy(
        update={"external_ids": ("project:analytics",)}
    )
    split = EntityResolutionService.resolve_observations(
        (split_first, split_second),
        resolver_version="resolver-v2",
        previous=merged,
    )

    assert any(item.event_type == "split" for item in split.lineage)
    assert merged.mapping_checksum != split.mapping_checksum
    assert len(merged.entities) == 1
    assert len(split.entities) == 2
