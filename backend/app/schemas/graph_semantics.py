"""Typed contracts for demo-faithful, evidence-derived graph semantics."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.agent_memory import AssertionPolarity


class GraphSemanticModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class EnrichmentStage(StrEnum):
    chunk_embedding = "chunk_embedding"
    first_pass_extraction = "first_pass_extraction"
    optional_glean = "optional_glean"
    evidence_fusion = "evidence_fusion"
    entity_embedding = "entity_embedding"
    relationship_embedding = "relationship_embedding"
    graph_publish = "graph_publish"


class DemoIngestionProfile(GraphSemanticModel):
    profile_version: str = Field(min_length=1, max_length=200)
    chunk_size_tokens: int = Field(default=1200, ge=1, le=100_000)
    chunk_overlap_tokens: int = Field(default=100, ge=0, le=10_000)
    description_threshold: int = Field(default=3, ge=1, le=100)
    embedding_model: str = Field(min_length=1, max_length=200)
    embedding_dimension: int = Field(ge=1, le=100_000)
    embedding_policy_version: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_chunk_overlap(self) -> DemoIngestionProfile:
        if self.chunk_overlap_tokens >= self.chunk_size_tokens:
            raise ValueError("chunk overlap must be smaller than chunk size")
        return self

    def validate_stage_order(self, stages: tuple[EnrichmentStage, ...]) -> bool:
        required = (
            EnrichmentStage.chunk_embedding,
            EnrichmentStage.first_pass_extraction,
            EnrichmentStage.evidence_fusion,
            EnrichmentStage.entity_embedding,
            EnrichmentStage.relationship_embedding,
            EnrichmentStage.graph_publish,
        )
        positions = {stage: index for index, stage in enumerate(stages)}
        if any(stage not in positions for stage in required):
            return False
        if any(
            positions[left] >= positions[right]
            for left, right in zip(required, required[1:])
        ):
            return False
        glean = positions.get(EnrichmentStage.optional_glean)
        return glean is None or (
            positions[EnrichmentStage.first_pass_extraction]
            < glean
            < positions[EnrichmentStage.evidence_fusion]
        )


class EntitySemanticEvidence(GraphSemanticModel):
    observation_id: UUID
    canonical_entity_id: UUID
    canonical_name: str = Field(min_length=1, max_length=1_000)
    entity_type: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=8_000)
    aliases: tuple[str, ...] = Field(default=(), max_length=1_000)
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)


class RelationshipSemanticEvidence(GraphSemanticModel):
    assertion_id: UUID
    relationship_id: UUID
    subject_entity_id: UUID
    subject_name: str = Field(min_length=1, max_length=1_000)
    predicate: str = Field(min_length=1, max_length=200)
    object_entity_id: UUID | None = None
    object_name: str | None = Field(default=None, min_length=1, max_length=1_000)
    object_value: str | None = Field(default=None, min_length=1, max_length=4_000)
    polarity: AssertionPolarity
    keywords: tuple[str, ...] = Field(default=(), max_length=100)
    description: str = Field(min_length=1, max_length=8_000)
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_object(self) -> RelationshipSemanticEvidence:
        if (self.object_entity_id is None) == (self.object_value is None):
            raise ValueError("exactly one relationship object is required")
        if self.object_entity_id is not None and self.object_name is None:
            raise ValueError("entity relationship objects require a source-backed name")
        if self.object_value is not None and self.object_name is not None:
            raise ValueError("literal relationship objects cannot have an entity name")
        return self


class SemanticEmbedding(GraphSemanticModel):
    vector: tuple[float, ...] = Field(min_length=1, max_length=100_000)
    model: str = Field(min_length=1, max_length=200)
    dimension: int = Field(ge=1, le=100_000)
    policy_version: str = Field(min_length=1, max_length=200)
    semantic_input_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")

    @model_validator(mode="after")
    def validate_dimension(self) -> SemanticEmbedding:
        if len(self.vector) != self.dimension:
            raise ValueError("embedding vector length must equal its dimension")
        return self


class GraphSemanticEntityDraft(GraphSemanticModel):
    entity_id: UUID
    canonical_name: str
    entity_type: str
    aliases: tuple[str, ...]
    description: str
    observation_ids: tuple[UUID, ...] = Field(min_length=1)
    revision_ids: tuple[UUID, ...] = Field(min_length=1)
    chunk_ids: tuple[str, ...] = Field(min_length=1)
    frequency: int = Field(ge=1)
    degree: int = Field(ge=0)
    semantic_input: str = Field(min_length=1)


class GraphSemanticEntity(GraphSemanticEntityDraft):
    embedding: SemanticEmbedding


class GraphSemanticRelationshipDraft(GraphSemanticModel):
    relationship_id: UUID
    subject_entity_id: UUID
    predicate: str
    object_entity_id: UUID | None = None
    object_value: str | None = None
    polarity: AssertionPolarity
    keywords: tuple[str, ...]
    description: str
    assertion_ids: tuple[UUID, ...] = Field(min_length=1)
    revision_ids: tuple[UUID, ...] = Field(min_length=1)
    chunk_ids: tuple[str, ...] = Field(min_length=1)
    frequency: int = Field(ge=1)
    degree: int = Field(ge=0)
    semantic_input: str = Field(min_length=1)


class GraphSemanticRelationship(GraphSemanticRelationshipDraft):
    embedding: SemanticEmbedding


class GraphSemanticMapping(GraphSemanticModel):
    chunk_id: str = Field(min_length=1, max_length=500)
    revision_id: UUID
    target_kind: Literal["entity", "relationship", "assertion"]
    target_id: UUID
    evidence_id: UUID


class GraphSemanticProjection(GraphSemanticModel):
    profile_version: str
    entities: tuple[GraphSemanticEntity, ...]
    relationships: tuple[GraphSemanticRelationship, ...]
    mappings: tuple[GraphSemanticMapping, ...]
    projection_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    is_complete: bool
