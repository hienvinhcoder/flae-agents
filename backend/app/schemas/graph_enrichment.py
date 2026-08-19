"""Minimal graph enrichment schemas retained for the ingestion workflow starter."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.graph_semantics import DemoIngestionProfile


class GraphEnrichmentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SemanticGraphEnrichmentWorkflowInput(GraphEnrichmentModel):
    workspace_id: UUID
    resolver_version: str = Field(min_length=1, max_length=200)
    projection_version: str = Field(min_length=1, max_length=200)
    semantic_profile: DemoIngestionProfile
