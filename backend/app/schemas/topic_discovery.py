"""Typed staging contracts for deterministic topic discovery."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.agent_memory_discovery import (
    MembershipDerivation,
    MembershipTargetKind,
    TaxonomyLineage,
    Topic,
)


class TopicDiscoveryModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TopicDiscoveryPolicy(TopicDiscoveryModel):
    promotion_min_distinct_chunks: int = Field(default=2, ge=2, le=100)
    resolution_overlap_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class TopicEvidenceWindow(TopicDiscoveryModel):
    window_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    candidate_name: str = Field(min_length=1, max_length=500)
    aliases: tuple[str, ...] = Field(default=(), max_length=100)
    target_kind: MembershipTargetKind
    target_id: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0.0, le=1.0)
    derivation: MembershipDerivation
    supporting_evidence_ids: tuple[UUID, ...] = Field(
        min_length=1, max_length=1_000
    )

    @field_validator("candidate_name", "chunk_id", "target_id")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("topic discovery identifiers cannot be blank")
        return value.strip()

    @field_validator("supporting_evidence_ids")
    @classmethod
    def require_unique_evidence(cls, value: tuple[UUID, ...]) -> tuple[UUID, ...]:
        if len(value) != len(set(value)):
            raise ValueError("supporting evidence IDs must be unique")
        return value


class TopicMembershipRevision(TopicDiscoveryModel):
    membership_id: UUID
    topic_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    supporting_evidence_ids: tuple[UUID, ...] = Field(
        min_length=1, max_length=1_000
    )


class TopicDiscoveryResult(TopicDiscoveryModel):
    discovery_run_id: UUID
    workspace_id: UUID
    graph_snapshot_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    taxonomy_version: str = Field(min_length=1, max_length=200)
    input_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    taxonomy_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    observed_at: datetime
    topics: tuple[Topic, ...] = Field(default=(), max_length=10_000)
    membership_revisions: tuple[TopicMembershipRevision, ...] = Field(
        default=(), max_length=100_000
    )
    lineage: tuple[TaxonomyLineage, ...] = Field(default=(), max_length=10_000)
    taxonomy_change_count: int = Field(ge=0)
    taxonomy_churn: float = Field(ge=0.0, le=1.0)
