"""Deterministic, conservative entity resolution over immutable observations."""

from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
import json
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from app.db.rag_db import DBManager
from app.schemas.agent_memory import ObservationAttribute
from app.schemas.graph_enrichment import (
    CanonicalEntityVersion,
    EntityResolutionProjection,
    ResolutionAssignment,
    ResolutionLineage,
    ResolutionObservation,
)
from app.services.knowalge_base.entity_resolution_repository import (
    EntityResolutionRepository,
)


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


def _attributes(item: ResolutionObservation) -> set[tuple[str, str]]:
    return {
        (attribute.name.casefold(), attribute.value.casefold())
        for attribute in item.disambiguation_attributes
    }


LineageEvent = Literal["created", "unchanged", "merged", "split"]


class EntityResolutionService:
    def __init__(self, manager: DBManager) -> None:
        self._repository = EntityResolutionRepository(manager)

    async def resolve_workspace(
        self,
        workspace_id: UUID,
        *,
        resolver_version: str,
        minimum_confidence: float = 0.75,
    ) -> EntityResolutionProjection:
        observations, previous = await self._repository.load_inputs(workspace_id)
        candidate = self.resolve_observations(
            observations,
            resolver_version=resolver_version,
            minimum_confidence=minimum_confidence,
        )
        if (
            previous is not None
            and previous.resolver_version == resolver_version
            and previous.evidence_checksum == candidate.evidence_checksum
            and previous.mapping_checksum == candidate.mapping_checksum
        ):
            return previous
        projection = self.resolve_observations(
            observations,
            resolver_version=resolver_version,
            minimum_confidence=minimum_confidence,
            previous=previous,
        )
        return await self._repository.persist(workspace_id, projection)

    @staticmethod
    def resolve_observations(
        observations: tuple[ResolutionObservation, ...],
        *,
        resolver_version: str,
        minimum_confidence: float = 0.75,
        previous: EntityResolutionProjection | None = None,
    ) -> EntityResolutionProjection:
        ordered = tuple(sorted(observations, key=lambda item: str(item.observation_id)))
        evidence_checksum = _checksum(
            [item.model_dump(mode="json") for item in ordered]
        )
        eligible = tuple(
            item for item in ordered if item.confidence >= minimum_confidence
        )
        groups = EntityResolutionService._groups(eligible)
        entities: list[CanonicalEntityVersion] = []
        assignments: list[ResolutionAssignment] = []
        for group in groups:
            entity = EntityResolutionService._entity(group)
            entities.append(entity)
            decision = "matched" if len(group) > 1 else "created"
            rationale = (
                "shared external identifier or disambiguating source context"
                if len(group) > 1
                else "no supported match; created a distinct canonical entity"
            )
            assignments.extend(
                ResolutionAssignment(
                    observation_id=item.observation_id,
                    revision_id=item.revision_id,
                    canonical_entity_id=entity.canonical_entity_id,
                    confidence=item.confidence,
                    decision=decision,
                    rationale=rationale,
                )
                for item in group
            )
        assignments.extend(
            ResolutionAssignment(
                observation_id=item.observation_id,
                revision_id=item.revision_id,
                canonical_entity_id=None,
                confidence=item.confidence,
                decision="unresolved",
                rationale="observation confidence is below the resolver threshold",
            )
            for item in ordered
            if item.confidence < minimum_confidence
        )
        ordered_entities = tuple(
            sorted(entities, key=lambda item: str(item.canonical_entity_id))
        )
        ordered_assignments = tuple(
            sorted(assignments, key=lambda item: str(item.observation_id))
        )
        mapping_checksum = _checksum(
            {
                "resolver_version": resolver_version,
                "entities": [item.model_dump(mode="json") for item in ordered_entities],
                "assignments": [
                    item.model_dump(mode="json") for item in ordered_assignments
                ],
            }
        )
        run_id = uuid5(
            NAMESPACE_URL,
            f"flae:resolution:{resolver_version}:{evidence_checksum}:{mapping_checksum}",
        )
        lineage = EntityResolutionService._lineage(
            run_id,
            ordered_assignments,
            previous,
        )
        return EntityResolutionProjection(
            resolution_run_id=run_id,
            resolver_version=resolver_version,
            evidence_checksum=evidence_checksum,
            mapping_checksum=mapping_checksum,
            entities=ordered_entities,
            assignments=ordered_assignments,
            lineage=lineage,
        )

    @staticmethod
    def _groups(
        observations: tuple[ResolutionObservation, ...],
    ) -> tuple[tuple[ResolutionObservation, ...], ...]:
        parent = list(range(len(observations)))

        def find(index: int) -> int:
            while parent[index] != index:
                parent[index] = parent[parent[index]]
                index = parent[index]
            return index

        def union(left: int, right: int) -> None:
            left_root, right_root = find(left), find(right)
            if left_root != right_root and can_join(left_root, right_root):
                parent[max(left_root, right_root)] = min(left_root, right_root)

        def can_join(left_root: int, right_root: int) -> bool:
            left_members = [
                item for index, item in enumerate(observations) if find(index) == left_root
            ]
            right_members = [
                item for index, item in enumerate(observations) if find(index) == right_root
            ]
            return not any(
                left.external_ids
                and right.external_ids
                and not (set(left.external_ids) & set(right.external_ids))
                for left in left_members
                for right in right_members
            )

        for left in range(len(observations)):
            for right in range(left + 1, len(observations)):
                if EntityResolutionService._supported_match(
                    observations[left], observations[right]
                ):
                    union(left, right)
        grouped: dict[int, list[ResolutionObservation]] = defaultdict(list)
        for index, item in enumerate(observations):
            grouped[find(index)].append(item)
        return tuple(
            tuple(sorted(group, key=lambda item: str(item.observation_id)))
            for _, group in sorted(grouped.items())
        )

    @staticmethod
    def _supported_match(
        left: ResolutionObservation, right: ResolutionObservation
    ) -> bool:
        if left.proposed_type != right.proposed_type:
            return False
        left_external, right_external = set(left.external_ids), set(right.external_ids)
        if left_external and right_external:
            return bool(left_external & right_external)
        return (
            left.normalized_mention == right.normalized_mention
            and bool(_attributes(left) & _attributes(right))
        )

    @staticmethod
    def _entity(
        group: tuple[ResolutionObservation, ...],
    ) -> CanonicalEntityVersion:
        external_ids = tuple(sorted({value for item in group for value in item.external_ids}))
        attributes = tuple(
            ObservationAttribute(name=name, value=value)
            for name, value in sorted(
                {
                    (attribute.name, attribute.value)
                    for item in group
                    for attribute in item.disambiguation_attributes
                }
            )
        )
        representative = sorted(
            group,
            key=lambda item: (
                -item.confidence,
                item.normalized_mention,
                item.raw_mention,
                str(item.observation_id),
            ),
        )[0]
        if external_ids:
            identity = f"external:{external_ids[0]}"
        elif len(group) > 1:
            shared = set.intersection(*(_attributes(item) for item in group))
            identity = (
                f"context:{representative.proposed_type}:"
                f"{representative.normalized_mention}:{sorted(shared)}"
            )
        else:
            identity = f"observation:{representative.observation_id}"
        return CanonicalEntityVersion(
            canonical_entity_id=uuid5(NAMESPACE_URL, f"flae:entity:{identity}"),
            canonical_name=representative.raw_mention,
            entity_type=representative.proposed_type,
            aliases=tuple(sorted({item.raw_mention for item in group})),
            external_ids=external_ids,
            disambiguation_attributes=attributes,
            confidence=sum(item.confidence for item in group) / len(group),
        )

    @staticmethod
    def _lineage(
        run_id: UUID,
        assignments: tuple[ResolutionAssignment, ...],
        previous: EntityResolutionProjection | None,
    ) -> tuple[ResolutionLineage, ...]:
        current = {
            item.observation_id: item.canonical_entity_id
            for item in assignments
            if item.canonical_entity_id is not None
        }
        if previous is None:
            by_entity: dict[UUID, list[UUID]] = defaultdict(list)
            for observation_id, entity_id in current.items():
                by_entity[entity_id].append(observation_id)
            created = tuple(
                EntityResolutionService._lineage_item(
                    run_id,
                    None,
                    "created",
                    (),
                    (entity_id,),
                    tuple(sorted(ids, key=str)),
                )
                for entity_id, ids in sorted(by_entity.items(), key=lambda pair: str(pair[0]))
            )
            return tuple(sorted(created, key=lambda item: str(item.lineage_id)))
        prior = {
            item.observation_id: item.canonical_entity_id
            for item in previous.assignments
            if item.canonical_entity_id is not None
        }
        events: list[ResolutionLineage] = []
        for prior_id in sorted(set(prior.values()), key=str):
            observations = tuple(key for key, value in prior.items() if value == prior_id)
            targets = tuple(
                sorted({current[key] for key in observations if key in current}, key=str)
            )
            if len(targets) > 1:
                events.append(
                    EntityResolutionService._lineage_item(
                        run_id,
                        previous.resolution_run_id,
                        "split",
                        (prior_id,),
                        targets,
                        tuple(sorted(observations, key=str)),
                    )
                )
        for current_id in sorted(set(current.values()), key=str):
            observations = tuple(key for key, value in current.items() if value == current_id)
            sources = tuple(
                sorted({prior[key] for key in observations if key in prior}, key=str)
            )
            event_type: LineageEvent = (
                "merged" if len(sources) > 1 else "unchanged"
            )
            if not sources:
                event_type = "created"
            events.append(
                EntityResolutionService._lineage_item(
                    run_id,
                    previous.resolution_run_id,
                    event_type,
                    sources,
                    (current_id,),
                    tuple(sorted(observations, key=str)),
                )
            )
        return tuple(sorted(events, key=lambda item: str(item.lineage_id)))

    @staticmethod
    def _lineage_item(
        run_id: UUID,
        predecessor_run_id: UUID | None,
        event_type: LineageEvent,
        from_ids: tuple[UUID, ...],
        to_ids: tuple[UUID, ...],
        observation_ids: tuple[UUID, ...],
    ) -> ResolutionLineage:
        identity = _checksum(
            {
                "run_id": str(run_id),
                "event_type": event_type,
                "from": [str(value) for value in from_ids],
                "to": [str(value) for value in to_ids],
                "observations": [str(value) for value in observation_ids],
            }
        )
        return ResolutionLineage(
            lineage_id=uuid5(NAMESPACE_URL, identity),
            predecessor_run_id=predecessor_run_id,
            event_type=event_type,
            from_entity_ids=from_ids,
            to_entity_ids=to_ids,
            observation_ids=observation_ids,
            confidence=1.0,
        )
