"""Rebuild semantic graph projections solely from active immutable evidence."""

from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
import json
from typing import Callable, Literal, Protocol, TypeVar
from uuid import UUID

from app.core.exceptions import InvalidArgumentError
from app.schemas.graph_semantics import (
    DemoIngestionProfile,
    EntitySemanticEvidence,
    GraphSemanticEntity,
    GraphSemanticEntityDraft,
    GraphSemanticMapping,
    GraphSemanticProjection,
    GraphSemanticRelationship,
    GraphSemanticRelationshipDraft,
    RelationshipSemanticEvidence,
    SemanticEmbedding,
)


class DescriptionSummarizer(Protocol):
    def __call__(self, name: str, descriptions: tuple[str, ...]) -> str: ...


class SemanticEmbedder(Protocol):
    def __call__(
        self, semantic_inputs: tuple[str, ...], dimension: int
    ) -> tuple[tuple[float, ...], ...]: ...


EvidenceT = TypeVar("EvidenceT")
MappingKey = tuple[
    str,
    UUID,
    Literal["entity", "relationship", "assertion"],
    UUID,
    UUID,
]


def _checksum(value: object) -> str:
    payload = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode()
    return "sha256:" + sha256(payload).hexdigest()


class GraphSemanticService:
    def __init__(
        self,
        profile: DemoIngestionProfile,
        *,
        embedder: SemanticEmbedder,
        summarizer: DescriptionSummarizer | None = None,
    ) -> None:
        self._profile = profile
        self._embedder = embedder
        self._summarizer = summarizer

    def build(
        self,
        entity_evidence: tuple[EntitySemanticEvidence, ...],
        relationship_evidence: tuple[RelationshipSemanticEvidence, ...],
    ) -> GraphSemanticProjection:
        observations = self._deduplicate(entity_evidence, key=lambda item: item.observation_id)
        assertions = self._deduplicate(
            relationship_evidence, key=lambda item: item.assertion_id
        )
        entity_groups: dict[UUID, list[EntitySemanticEvidence]] = defaultdict(list)
        for item in observations:
            entity_groups[item.canonical_entity_id].append(item)
        relationship_groups: dict[UUID, list[RelationshipSemanticEvidence]] = defaultdict(list)
        for item in assertions:
            relationship_groups[item.relationship_id].append(item)

        incident: dict[UUID, set[UUID]] = defaultdict(set)
        for relationship_id, evidence in relationship_groups.items():
            first = evidence[0]
            incident[first.subject_entity_id].add(relationship_id)
            if first.object_entity_id is not None:
                incident[first.object_entity_id].add(relationship_id)

        entity_drafts = tuple(
            self._build_entity_draft(
                entity_id, tuple(group), len(incident[entity_id])
            )
            for entity_id, group in sorted(entity_groups.items(), key=lambda pair: str(pair[0]))
        )
        entity_degrees = {item.entity_id: item.degree for item in entity_drafts}
        relationship_drafts = tuple(
            self._build_relationship_draft(
                relationship_id, tuple(group), entity_degrees
            )
            for relationship_id, group in sorted(
                relationship_groups.items(), key=lambda pair: str(pair[0])
            )
        )
        semantic_inputs = tuple(
            item.semantic_input for item in (*entity_drafts, *relationship_drafts)
        )
        embeddings = self._embeddings(semantic_inputs)
        entity_count = len(entity_drafts)
        entities = tuple(
            GraphSemanticEntity(
                **draft.model_dump(), embedding=embeddings[index]
            )
            for index, draft in enumerate(entity_drafts)
        )
        relationships = tuple(
            GraphSemanticRelationship(
                **draft.model_dump(), embedding=embeddings[entity_count + index]
            )
            for index, draft in enumerate(relationship_drafts)
        )
        mappings = self._build_mappings(observations, assertions)
        payload = {
            "profile_version": self._profile.profile_version,
            "entities": [item.model_dump(mode="json") for item in entities],
            "relationships": [item.model_dump(mode="json") for item in relationships],
            "mappings": [item.model_dump(mode="json") for item in mappings],
        }
        return GraphSemanticProjection(
            **payload,
            projection_checksum=_checksum(payload),
            is_complete=all(item.embedding.vector for item in (*entities, *relationships)),
        )

    def _build_entity_draft(
        self,
        entity_id: UUID,
        evidence: tuple[EntitySemanticEvidence, ...],
        degree: int,
    ) -> GraphSemanticEntityDraft:
        names = {item.canonical_name for item in evidence}
        types = {item.entity_type for item in evidence}
        if len(names) != 1 or len(types) != 1:
            raise InvalidArgumentError(
                "Canonical entity evidence must agree on name and type."
            )
        canonical_name = next(iter(names))
        description = self._fuse_descriptions(
            canonical_name, tuple(item.description for item in evidence)
        )
        semantic_input = f"{canonical_name}\n{description}"
        return GraphSemanticEntityDraft(
            entity_id=entity_id,
            canonical_name=canonical_name,
            entity_type=next(iter(types)),
            aliases=tuple(sorted({alias for item in evidence for alias in item.aliases})),
            description=description,
            observation_ids=tuple(sorted({item.observation_id for item in evidence}, key=str)),
            revision_ids=tuple(sorted({item.revision_id for item in evidence}, key=str)),
            chunk_ids=tuple(sorted({item.chunk_id for item in evidence})),
            frequency=len({item.observation_id for item in evidence}),
            degree=degree,
            semantic_input=semantic_input,
        )

    def _build_relationship_draft(
        self,
        relationship_id: UUID,
        evidence: tuple[RelationshipSemanticEvidence, ...],
        entity_degrees: dict[UUID, int],
    ) -> GraphSemanticRelationshipDraft:
        first = evidence[0]
        identity = {
            (
                item.subject_entity_id,
                item.predicate,
                item.object_entity_id,
                item.object_value,
                item.polarity,
            )
            for item in evidence
        }
        if len(identity) != 1:
            raise InvalidArgumentError(
                "Relationship evidence must preserve one directed identity."
            )
        subject_degree = entity_degrees.get(first.subject_entity_id)
        target_degree = (
            entity_degrees.get(first.object_entity_id)
            if first.object_entity_id
            else None
        )
        if subject_degree is None or (
            first.object_entity_id is not None and target_degree is None
        ):
            raise InvalidArgumentError(
                "Relationship endpoints require active source-backed entity evidence."
            )
        keywords = tuple(sorted({word for item in evidence for word in item.keywords}))
        name = f"{first.subject_name} {first.predicate} {first.object_name or first.object_value}"
        description = self._fuse_descriptions(
            name, tuple(item.description for item in evidence)
        )
        keyword_text = " ".join(keywords) or first.predicate
        object_text = first.object_name or first.object_value or ""
        semantic_input = (
            f"{keyword_text}\t{first.subject_name}\n{object_text}\n{description}"
        )
        degree = subject_degree + (target_degree or 0)
        return GraphSemanticRelationshipDraft(
            relationship_id=relationship_id,
            subject_entity_id=first.subject_entity_id,
            predicate=first.predicate,
            object_entity_id=first.object_entity_id,
            object_value=first.object_value,
            polarity=first.polarity,
            keywords=keywords,
            description=description,
            assertion_ids=tuple(sorted({item.assertion_id for item in evidence}, key=str)),
            revision_ids=tuple(sorted({item.revision_id for item in evidence}, key=str)),
            chunk_ids=tuple(sorted({item.chunk_id for item in evidence})),
            frequency=len({item.assertion_id for item in evidence}),
            degree=degree,
            semantic_input=semantic_input,
        )

    def _embeddings(
        self, semantic_inputs: tuple[str, ...]
    ) -> tuple[SemanticEmbedding, ...]:
        if not semantic_inputs:
            return ()
        vectors = self._embedder(
            semantic_inputs, self._profile.embedding_dimension
        )
        if len(vectors) != len(semantic_inputs):
            raise InvalidArgumentError(
                "Embedding provider returned an incomplete semantic batch."
            )
        return tuple(
            SemanticEmbedding(
                vector=vector,
                model=self._profile.embedding_model,
                dimension=self._profile.embedding_dimension,
                policy_version=self._profile.embedding_policy_version,
                semantic_input_checksum=_checksum(semantic_input),
            )
            for semantic_input, vector in zip(
                semantic_inputs, vectors, strict=True
            )
        )

    def _fuse_descriptions(self, name: str, values: tuple[str, ...]) -> str:
        descriptions = tuple(sorted({value.strip() for value in values if value.strip()}))
        if not descriptions:
            raise InvalidArgumentError("Semantic evidence requires a description.")
        if len(descriptions) <= self._profile.description_threshold:
            return " ".join(descriptions)
        if self._summarizer is None:
            raise InvalidArgumentError(
                "Description threshold exceeded without a configured summarizer."
            )
        summary = self._summarizer(name, descriptions).strip()
        if not summary:
            raise InvalidArgumentError("Description summarizer returned an empty result.")
        return summary

    @staticmethod
    def _deduplicate(
        items: tuple[EvidenceT, ...], *, key: Callable[[EvidenceT], UUID]
    ) -> tuple[EvidenceT, ...]:
        unique: dict[UUID, EvidenceT] = {}
        for item in items:
            item_id = key(item)
            previous = unique.get(item_id)
            if previous is not None and previous != item:
                raise InvalidArgumentError("Evidence identity maps to conflicting data.")
            unique[item_id] = item
        return tuple(unique[item_id] for item_id in sorted(unique, key=str))

    @staticmethod
    def _build_mappings(
        observations: tuple[EntitySemanticEvidence, ...],
        assertions: tuple[RelationshipSemanticEvidence, ...],
    ) -> tuple[GraphSemanticMapping, ...]:
        mappings: set[MappingKey] = {
            (
                item.chunk_id,
                item.revision_id,
                "entity",
                item.canonical_entity_id,
                item.observation_id,
            )
            for item in observations
        }
        for item in assertions:
            mappings.add(
                (
                    item.chunk_id,
                    item.revision_id,
                    "relationship",
                    item.relationship_id,
                    item.assertion_id,
                )
            )
            mappings.add(
                (
                    item.chunk_id,
                    item.revision_id,
                    "assertion",
                    item.assertion_id,
                    item.assertion_id,
                )
            )
        return tuple(
            GraphSemanticMapping(
                chunk_id=chunk_id,
                revision_id=revision_id,
                target_kind=target_kind,
                target_id=target_id,
                evidence_id=evidence_id,
            )
            for chunk_id, revision_id, target_kind, target_id, evidence_id in sorted(
                mappings,
                key=lambda item: (item[0], item[2], str(item[3]), str(item[4])),
            )
        )
