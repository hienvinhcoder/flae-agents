"""Topic and context navigation contracts for Company Memory."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DiscoveryContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DerivedSummary(DiscoveryContractModel):
    text: str = Field(min_length=1, max_length=20_000)
    supporting_evidence_ids: tuple[UUID, ...] = Field(min_length=1, max_length=1_000)
    generated_at: datetime
    summary_version: str = Field(min_length=1, max_length=200)
    is_derived: Literal[True] = True


class TopicSummary(DerivedSummary):
    content_kind: Literal["topic_navigation_summary"] = "topic_navigation_summary"
    topic_id: UUID


class ContextSummary(DerivedSummary):
    content_kind: Literal["context_navigation_summary"] = "context_navigation_summary"
    context_id: UUID


class TaxonomyLifecycle(StrEnum):
    candidate = "candidate"
    active = "active"
    stale = "stale"
    merged = "merged"
    archived = "archived"


class MembershipTargetKind(StrEnum):
    source = "source"
    document = "document"
    chunk = "chunk"
    entity = "entity"
    assertion = "assertion"
    topic = "topic"


class MembershipDerivation(StrEnum):
    source_structure = "source_structure"
    graph_overlap = "graph_overlap"
    embedding = "embedding"
    temporal = "temporal"
    combined = "combined"


class EvidenceMembership(DiscoveryContractModel):
    membership_id: UUID
    target_kind: MembershipTargetKind
    target_id: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0.0, le=1.0)
    derivation: MembershipDerivation
    first_seen_snapshot_id: UUID
    last_seen_snapshot_id: UUID
    supporting_evidence_ids: tuple[UUID, ...] = Field(min_length=1, max_length=1_000)


class TaxonomyLineageKind(StrEnum):
    created = "created"
    renamed = "renamed"
    merged = "merged"
    split_event = "split"
    stale = "stale"
    archived = "archived"


class TaxonomyLineage(DiscoveryContractModel):
    kind: TaxonomyLineageKind
    occurred_at: datetime
    snapshot_id: UUID
    predecessor_ids: tuple[UUID, ...] = Field(default=(), max_length=100)
    successor_ids: tuple[UUID, ...] = Field(default=(), max_length=100)
    evidence_ids: tuple[UUID, ...] = Field(default=(), max_length=1_000)


class Topic(DiscoveryContractModel):
    topic_id: UUID
    workspace_id: UUID
    name: str = Field(min_length=1, max_length=500)
    aliases: tuple[str, ...] = Field(default=(), max_length=100)
    lifecycle: TaxonomyLifecycle
    primary_parent_id: UUID | None = None
    secondary_parent_ids: tuple[UUID, ...] = Field(default=(), max_length=100)
    summary: TopicSummary | None = None
    memberships: tuple[EvidenceMembership, ...] = Field(default=(), max_length=10_000)
    lineage: tuple[TaxonomyLineage, ...] = Field(default=(), max_length=1_000)
    promotion_evidence_count: int = Field(default=0, ge=0)
    discovery_version: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_summary_identity(self) -> Topic:
        if self.summary is not None and self.summary.topic_id != self.topic_id:
            raise ValueError("topic summary identity does not match topic")
        if self.lifecycle is TaxonomyLifecycle.active and self.promotion_evidence_count < 2:
            raise ValueError("active topics require at least two evidence windows")
        return self


class Context(DiscoveryContractModel):
    context_id: UUID
    workspace_id: UUID
    name: str = Field(min_length=1, max_length=500)
    aliases: tuple[str, ...] = Field(default=(), max_length=100)
    context_type: str = Field(min_length=1, max_length=200)
    lifecycle: TaxonomyLifecycle
    confidence: float = Field(ge=0.0, le=1.0)
    stability_score: float = Field(ge=0.0, le=1.0)
    summary: ContextSummary | None = None
    primary_topic_root_ids: tuple[UUID, ...] = Field(default=(), max_length=100)
    memberships: tuple[EvidenceMembership, ...] = Field(default=(), max_length=10_000)
    lineage: tuple[TaxonomyLineage, ...] = Field(default=(), max_length=1_000)
    discovery_version: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_summary_identity(self) -> Context:
        if self.summary is not None and self.summary.context_id != self.context_id:
            raise ValueError("context summary identity does not match context")
        return self
