"""Typed contracts for rebuildable entity and graph projections."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.agent_memory import AssertionPolarity, ObservationAttribute
from app.schemas.graph_semantics import DemoIngestionProfile


class GraphEnrichmentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class ResolutionObservation(GraphEnrichmentModel):
    observation_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    raw_mention: str = Field(min_length=1, max_length=1_000)
    normalized_mention: str = Field(min_length=1, max_length=1_000)
    proposed_type: str = Field(min_length=1, max_length=200)
    confidence: float = Field(ge=0.0, le=1.0)
    external_ids: tuple[str, ...] = Field(default=(), max_length=100)
    disambiguation_attributes: tuple[ObservationAttribute, ...] = Field(
        default=(), max_length=100
    )
    graph_neighbor_mentions: tuple[str, ...] = Field(default=(), max_length=1_000)


class CanonicalEntityVersion(GraphEnrichmentModel):
    canonical_entity_id: UUID
    canonical_name: str = Field(min_length=1, max_length=1_000)
    entity_type: str = Field(min_length=1, max_length=200)
    aliases: tuple[str, ...] = Field(default=(), max_length=1_000)
    external_ids: tuple[str, ...] = Field(default=(), max_length=1_000)
    disambiguation_attributes: tuple[ObservationAttribute, ...] = Field(
        default=(), max_length=1_000
    )
    confidence: float = Field(ge=0.0, le=1.0)


class ResolutionAssignment(GraphEnrichmentModel):
    observation_id: UUID
    revision_id: UUID
    canonical_entity_id: UUID | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    decision: Literal["created", "matched", "unresolved"]
    rationale: str = Field(min_length=1, max_length=500)


class ResolutionLineage(GraphEnrichmentModel):
    lineage_id: UUID
    predecessor_run_id: UUID | None = None
    event_type: Literal["created", "unchanged", "merged", "split"]
    from_entity_ids: tuple[UUID, ...] = Field(default=(), max_length=1_000)
    to_entity_ids: tuple[UUID, ...] = Field(default=(), max_length=1_000)
    observation_ids: tuple[UUID, ...] = Field(default=(), max_length=10_000)
    confidence: float = Field(ge=0.0, le=1.0)


class EntityResolutionProjection(GraphEnrichmentModel):
    resolution_run_id: UUID
    resolver_version: str = Field(min_length=1, max_length=200)
    evidence_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    mapping_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    entities: tuple[CanonicalEntityVersion, ...]
    assignments: tuple[ResolutionAssignment, ...]
    lineage: tuple[ResolutionLineage, ...]


class ProjectionAssertion(GraphEnrichmentModel):
    assertion_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    subject_observation_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    object_observation_id: UUID | None = None
    object_value: str | None = Field(default=None, max_length=4_000)
    polarity: AssertionPolarity
    confidence: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_object(self) -> ProjectionAssertion:
        if (self.object_observation_id is None) == (self.object_value is None):
            raise ValueError("exactly one projected assertion object is required")
        return self


class CanonicalRelationshipVersion(GraphEnrichmentModel):
    relationship_id: UUID
    subject_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    object_entity_id: UUID | None = None
    object_value: str | None = Field(default=None, max_length=4_000)
    polarity: AssertionPolarity
    confidence: float = Field(ge=0.0, le=1.0)
    frequency: int = Field(ge=1)
    assertion_ids: tuple[UUID, ...] = Field(min_length=1, max_length=100_000)
    chunk_ids: tuple[str, ...] = Field(min_length=1, max_length=100_000)
    revision_ids: tuple[UUID, ...] = Field(min_length=1, max_length=100_000)

    @model_validator(mode="after")
    def validate_object(self) -> CanonicalRelationshipVersion:
        if (self.object_entity_id is None) == (self.object_value is None):
            raise ValueError("exactly one canonical relationship object is required")
        return self


class GraphMapping(GraphEnrichmentModel):
    mapping_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    assertion_id: UUID
    target_kind: Literal["entity", "relationship", "assertion"]
    target_id: UUID


class GraphProjection(GraphEnrichmentModel):
    projection_id: UUID
    resolution_run_id: UUID
    projection_version: str = Field(min_length=1, max_length=200)
    evidence_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    projection_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    relationships: tuple[CanonicalRelationshipVersion, ...]
    mappings: tuple[GraphMapping, ...]


class GraphSnapshotRevision(GraphEnrichmentModel):
    revision_id: UUID
    content_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    acl_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class GraphSnapshot(GraphEnrichmentModel):
    snapshot_id: UUID
    projection_id: UUID
    resolution_run_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    graph_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    status: Literal["staging", "current", "historical", "failed"]
    revisions: tuple[GraphSnapshotRevision, ...] = Field(min_length=1)


class GraphSnapshotPublishResult(GraphEnrichmentModel):
    snapshot_id: UUID
    projection_id: UUID
    semantic_projection_id: UUID | None = None
    revision_count: int = Field(ge=1)
    entity_count: int = Field(default=0, ge=0)
    relationship_count: int = Field(ge=0)
    mapping_count: int = Field(ge=0)
    graph_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    published: bool


class EntityResolutionActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    resolver_version: str = Field(min_length=1, max_length=200)
    minimum_confidence: float = Field(default=0.75, ge=0.0, le=1.0)


class EntityResolutionResult(GraphEnrichmentModel):
    resolution_run_id: UUID
    evidence_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    mapping_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    entity_count: int = Field(ge=0)
    assignment_count: int = Field(ge=0)


class GraphProjectionActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    projection_version: str = Field(min_length=1, max_length=200)


class GraphProjectionResult(GraphEnrichmentModel):
    projection_id: UUID
    resolution_run_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    projection_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    relationship_count: int = Field(ge=0)
    mapping_count: int = Field(ge=0)


class GraphSnapshotActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    projection_id: UUID


class GraphSemanticActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    resolution_run_id: UUID
    relationship_projection_id: UUID
    profile: DemoIngestionProfile


class CompleteGraphSnapshotActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    projection_id: UUID
    semantic_projection_id: UUID


class GraphFailureActivityInput(GraphEnrichmentModel):
    workspace_id: UUID
    reason: str = Field(min_length=1, max_length=500)


class GraphEnrichmentWorkflowInput(GraphEnrichmentModel):
    workspace_id: UUID
    resolver_version: str = Field(min_length=1, max_length=200)
    projection_version: str = Field(min_length=1, max_length=200)
    minimum_resolution_confidence: float = Field(default=0.75, ge=0.0, le=1.0)


class SemanticGraphEnrichmentWorkflowInput(GraphEnrichmentModel):
    workspace_id: UUID
    resolver_version: str = Field(min_length=1, max_length=200)
    projection_version: str = Field(min_length=1, max_length=200)
    semantic_profile: DemoIngestionProfile = Field(
        default_factory=lambda: DemoIngestionProfile(
            profile_version="demo-reference-v1",
            embedding_model="gemini-embedding-001",
            embedding_dimension=1024,
            embedding_policy_version="semantic-input-v1",
        )
    )
    minimum_resolution_confidence: float = Field(default=0.75, ge=0.0, le=1.0)
