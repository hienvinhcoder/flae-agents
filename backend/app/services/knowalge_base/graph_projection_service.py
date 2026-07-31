"""Deterministic directed relationship and bidirectional mapping projection."""

from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
import json
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.graph_enrichment import (
    CanonicalRelationshipVersion,
    EntityResolutionProjection,
    GraphMapping,
    GraphProjection,
    ProjectionAssertion,
)
from app.services.knowalge_base.entity_resolution_repository import (
    EntityResolutionRepository,
)
from app.services.knowalge_base.graph_projection_repository import (
    GraphProjectionRepository,
)


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


class GraphProjectionService:
    def __init__(self, manager: DBManager) -> None:
        self._resolution_repository = EntityResolutionRepository(manager)
        self._repository = GraphProjectionRepository(manager)

    async def project_workspace(
        self, workspace_id: UUID, *, projection_version: str
    ) -> GraphProjection:
        observations, resolution = await self._resolution_repository.load_inputs(
            workspace_id
        )
        if resolution is None:
            raise InvalidArgumentError(
                "Graph projection requires a completed entity-resolution version."
            )
        if {item.observation_id for item in observations} != {
            item.observation_id for item in resolution.assignments
        }:
            raise InvalidArgumentError(
                "Entity-resolution version is stale for current evidence."
            )
        assertions, revision_set_checksum = await self._repository.load_evidence(
            workspace_id
        )
        projection = self.project(
            resolution,
            assertions,
            projection_version=projection_version,
            revision_set_checksum=revision_set_checksum,
        )
        return await self._repository.persist(workspace_id, projection)

    @staticmethod
    def project(
        resolution: EntityResolutionProjection,
        assertions: tuple[ProjectionAssertion, ...],
        *,
        projection_version: str,
        revision_set_checksum: str | None = None,
    ) -> GraphProjection:
        unique = GraphProjectionService._deduplicate_assertions(assertions)
        assignments = {
            item.observation_id: item.canonical_entity_id
            for item in resolution.assignments
            if item.canonical_entity_id is not None
        }
        grouped: dict[
            tuple[UUID, str, UUID | None, str | None, str],
            list[ProjectionAssertion],
        ] = defaultdict(list)
        mappings: dict[UUID, GraphMapping] = {}
        for assertion in unique:
            GraphProjectionService._add_mapping(
                mappings, assertion, "assertion", assertion.assertion_id
            )
            subject_id = assignments.get(assertion.subject_observation_id)
            object_id = (
                assignments.get(assertion.object_observation_id)
                if assertion.object_observation_id is not None
                else None
            )
            if subject_id is None:
                continue
            GraphProjectionService._add_mapping(
                mappings, assertion, "entity", subject_id
            )
            if assertion.object_observation_id is not None and object_id is None:
                continue
            if object_id is not None:
                GraphProjectionService._add_mapping(
                    mappings, assertion, "entity", object_id
                )
            key = (
                subject_id,
                assertion.predicate,
                object_id,
                assertion.object_value,
                assertion.polarity.value,
            )
            grouped[key].append(assertion)
        relationships: list[CanonicalRelationshipVersion] = []
        for key, evidence in grouped.items():
            subject_id, predicate, object_id, object_value, polarity = key
            identity = _checksum(
                {
                    "subject_entity_id": str(subject_id),
                    "predicate": predicate,
                    "object_entity_id": str(object_id) if object_id else None,
                    "object_value": object_value,
                    "polarity": polarity,
                }
            )
            relationship_id = uuid5(NAMESPACE_URL, f"flae:relationship:{identity}")
            ordered_evidence = sorted(evidence, key=lambda item: str(item.assertion_id))
            relationship = CanonicalRelationshipVersion(
                relationship_id=relationship_id,
                subject_entity_id=subject_id,
                predicate=predicate,
                object_entity_id=object_id,
                object_value=object_value,
                polarity=polarity,
                confidence=(
                    sum(item.confidence for item in ordered_evidence)
                    / len(ordered_evidence)
                ),
                frequency=len(ordered_evidence),
                assertion_ids=tuple(item.assertion_id for item in ordered_evidence),
                chunk_ids=tuple(sorted({item.chunk_id for item in ordered_evidence})),
                revision_ids=tuple(
                    sorted({item.revision_id for item in ordered_evidence}, key=str)
                ),
            )
            relationships.append(relationship)
            for assertion in ordered_evidence:
                GraphProjectionService._add_mapping(
                    mappings, assertion, "relationship", relationship_id
                )
        ordered_relationships = tuple(
            sorted(relationships, key=lambda item: str(item.relationship_id))
        )
        ordered_mappings = tuple(
            sorted(mappings.values(), key=lambda item: str(item.mapping_id))
        )
        evidence_checksum = _checksum(
            [item.model_dump(mode="json") for item in unique]
        )
        revision_checksum = revision_set_checksum or _checksum(
            [str(value) for value in sorted({item.revision_id for item in unique}, key=str)]
        )
        projection_checksum = _checksum(
            {
                "resolution_run_id": str(resolution.resolution_run_id),
                "projection_version": projection_version,
                "revision_set_checksum": revision_checksum,
                "relationships": [
                    item.model_dump(mode="json") for item in ordered_relationships
                ],
                "mappings": [item.model_dump(mode="json") for item in ordered_mappings],
            }
        )
        projection_id = uuid5(
            NAMESPACE_URL,
            f"flae:projection:{resolution.resolution_run_id}:"
            f"{projection_version}:{evidence_checksum}:{projection_checksum}",
        )
        return GraphProjection(
            projection_id=projection_id,
            resolution_run_id=resolution.resolution_run_id,
            projection_version=projection_version,
            evidence_checksum=evidence_checksum,
            revision_set_checksum=revision_checksum,
            projection_checksum=projection_checksum,
            relationships=ordered_relationships,
            mappings=ordered_mappings,
        )

    @staticmethod
    def mappings_for_chunk(
        projection: GraphProjection, chunk_id: str
    ) -> tuple[GraphMapping, ...]:
        return tuple(item for item in projection.mappings if item.chunk_id == chunk_id)

    @staticmethod
    def mappings_for_target(
        projection: GraphProjection,
        *,
        target_kind: Literal["entity", "relationship", "assertion"],
        target_id: UUID,
    ) -> tuple[GraphMapping, ...]:
        return tuple(
            item
            for item in projection.mappings
            if item.target_kind == target_kind and item.target_id == target_id
        )

    @staticmethod
    def _deduplicate_assertions(
        assertions: tuple[ProjectionAssertion, ...],
    ) -> tuple[ProjectionAssertion, ...]:
        by_id: dict[UUID, ProjectionAssertion] = {}
        for assertion in assertions:
            existing = by_id.get(assertion.assertion_id)
            if existing is not None and existing != assertion:
                raise InvalidArgumentError(
                    "Duplicate assertion ID maps to conflicting evidence."
                )
            by_id[assertion.assertion_id] = assertion
        return tuple(by_id[key] for key in sorted(by_id, key=str))

    @staticmethod
    def _add_mapping(
        mappings: dict[UUID, GraphMapping],
        assertion: ProjectionAssertion,
        target_kind: Literal["entity", "relationship", "assertion"],
        target_id: UUID,
    ) -> None:
        identity = _checksum(
            {
                "assertion_id": str(assertion.assertion_id),
                "target_kind": target_kind,
                "target_id": str(target_id),
            }
        )
        mapping_id = uuid5(NAMESPACE_URL, f"flae:mapping:{identity}")
        mappings[mapping_id] = GraphMapping(
            mapping_id=mapping_id,
            revision_id=assertion.revision_id,
            chunk_id=assertion.chunk_id,
            assertion_id=assertion.assertion_id,
            target_kind=target_kind,
            target_id=target_id,
        )
