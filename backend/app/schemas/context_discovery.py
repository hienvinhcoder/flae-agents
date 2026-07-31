"""Typed staging contracts for overlapping context discovery."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.agent_memory_discovery import (
    Context,
    MembershipDerivation,
    MembershipTargetKind,
)


class ContextDiscoveryModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ContextDiscoveryPolicy(ContextDiscoveryModel):
    promotion_min_distinct_sources: int = Field(default=2, ge=2, le=100)
    resolution_overlap_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class ContextEvidenceSignal(ContextDiscoveryModel):
    signal_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    source_id: UUID
    candidate_name: str = Field(min_length=1, max_length=500)
    aliases: tuple[str, ...] = Field(default=(), max_length=100)
    context_type: str = Field(min_length=1, max_length=200)
    target_kind: MembershipTargetKind
    target_id: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0.0, le=1.0)
    derivation: MembershipDerivation
    supporting_evidence_ids: tuple[UUID, ...] = Field(
        min_length=1, max_length=1_000
    )
    graph_relationship_ids: tuple[UUID, ...] = Field(default=(), max_length=1_000)
    topic_ids: tuple[UUID, ...] = Field(default=(), max_length=1_000)

    @field_validator("candidate_name", "context_type", "chunk_id", "target_id")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("context discovery values cannot be blank")
        return value.strip()


class ContextMembershipRevision(ContextDiscoveryModel):
    membership_id: UUID
    context_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    supporting_evidence_ids: tuple[UUID, ...] = Field(
        min_length=1, max_length=1_000
    )


class ContextGraphBridge(ContextDiscoveryModel):
    relationship_id: UUID
    left_context_id: UUID
    right_context_id: UUID
    supporting_evidence_ids: tuple[UUID, ...] = Field(
        min_length=1, max_length=1_000
    )


class ContextDiscoveryResult(ContextDiscoveryModel):
    discovery_run_id: UUID
    workspace_id: UUID
    topic_discovery_run_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    discovery_version: str = Field(min_length=1, max_length=200)
    input_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    context_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    observed_at: datetime
    contexts: tuple[Context, ...] = Field(default=(), max_length=10_000)
    membership_revisions: tuple[ContextMembershipRevision, ...] = Field(
        default=(), max_length=100_000
    )
    graph_bridges: tuple[ContextGraphBridge, ...] = Field(
        default=(), max_length=100_000
    )
    taxonomy_change_count: int = Field(ge=0)
    taxonomy_churn: float = Field(ge=0.0, le=1.0)
