"""References-only contracts for topic/context discovery orchestration."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.context_discovery import ContextDiscoveryPolicy
from app.schemas.discovery_catalog import DiscoverySnapshot
from app.schemas.topic_discovery import TopicDiscoveryPolicy


class DiscoveryWorkflowModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class DiscoveryWorkflowInput(DiscoveryWorkflowModel):
    workspace_id: UUID
    graph_snapshot_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    taxonomy_version: str = Field(default="taxonomy-v1", min_length=1, max_length=200)
    context_version: str = Field(default="context-v1", min_length=1, max_length=200)
    topic_policy: TopicDiscoveryPolicy = TopicDiscoveryPolicy()
    context_policy: ContextDiscoveryPolicy = ContextDiscoveryPolicy()


class DiscoveryFailureInput(DiscoveryWorkflowModel):
    workspace_id: UUID
    reason: str = Field(min_length=1, max_length=500)


class DiscoveryWorkflowResult(DiscoverySnapshot):
    pass
