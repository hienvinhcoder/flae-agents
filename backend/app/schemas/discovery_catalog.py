"""Contracts for atomic discovery snapshots and catalog navigation."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.context_discovery import ContextDiscoveryResult
from app.schemas.agent_memory_discovery import (
    ContextSummary,
    TaxonomyLineage,
    TopicSummary,
)
from app.schemas.topic_discovery import TopicDiscoveryResult


class DiscoveryCatalogModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DiscoveryProjectionBundle(DiscoveryCatalogModel):
    topics: TopicDiscoveryResult
    contexts: ContextDiscoveryResult

    @model_validator(mode="after")
    def validate_consistent_projection(self) -> "DiscoveryProjectionBundle":
        if self.topics.workspace_id != self.contexts.workspace_id:
            raise ValueError("discovery bundle workspace does not match")
        if (
            self.topics.revision_set_checksum
            != self.contexts.revision_set_checksum
        ):
            raise ValueError("discovery bundle revision set does not match")
        if (
            self.contexts.topic_discovery_run_id
            != self.topics.discovery_run_id
        ):
            raise ValueError("context projection does not reference the topic run")
        topic_ids = {topic.topic_id for topic in self.topics.topics}
        referenced_ids = {
            topic_id
            for context in self.contexts.contexts
            for topic_id in context.primary_topic_root_ids
        }
        if not referenced_ids <= topic_ids:
            raise ValueError("context projection references an unknown topic")
        return self


class DiscoverySnapshotBasis(DiscoveryCatalogModel):
    graph_snapshot_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class DiscoverySnapshot(DiscoveryCatalogModel):
    snapshot_id: UUID
    workspace_id: UUID
    graph_snapshot_id: UUID
    topic_discovery_run_id: UUID
    context_discovery_run_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    discovery_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    status: Literal["current"] = "current"
    topic_count: int = Field(ge=0)
    context_count: int = Field(ge=0)
    published_at: datetime


class AuthorizedCatalogSnapshot(DiscoveryCatalogModel):
    snapshot_id: UUID
    published_at: datetime
    topics: TopicDiscoveryResult
    contexts: ContextDiscoveryResult
    authorized_evidence_ids: tuple[UUID, ...] = Field(max_length=100_000)


class CatalogListRequest(DiscoveryCatalogModel):
    workspace_id: UUID
    subject_id: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = Field(default=None, min_length=1, max_length=4_000)


class CatalogTopicItem(DiscoveryCatalogModel):
    topic_id: UUID
    name: str
    summary: TopicSummary | None = None
    lineage: tuple[TaxonomyLineage, ...] = ()
    source_count: int = Field(ge=0)
    evidence_count: int = Field(ge=0)
    supporting_evidence_ids: tuple[UUID, ...] = ()
    freshness: datetime
    confidence: float = Field(ge=0.0, le=1.0)


class CatalogContextItem(DiscoveryCatalogModel):
    context_id: UUID
    name: str
    context_type: str
    summary: ContextSummary | None = None
    lineage: tuple[TaxonomyLineage, ...] = ()
    topic_ids: tuple[UUID, ...] = ()
    topic_count: int = Field(ge=0)
    source_count: int = Field(ge=0)
    evidence_count: int = Field(ge=0)
    supporting_evidence_ids: tuple[UUID, ...] = ()
    freshness: datetime
    confidence: float = Field(ge=0.0, le=1.0)
    stability_score: float = Field(ge=0.0, le=1.0)


class CatalogContextPage(DiscoveryCatalogModel):
    snapshot_id: UUID
    items: tuple[CatalogContextItem, ...]
    next_cursor: str | None = None


class CatalogTopicPage(DiscoveryCatalogModel):
    snapshot_id: UUID
    context_id: UUID
    items: tuple[CatalogTopicItem, ...]
    next_cursor: str | None = None


class CatalogContextDetail(CatalogContextItem):
    topics: tuple[CatalogTopicItem, ...] = ()
