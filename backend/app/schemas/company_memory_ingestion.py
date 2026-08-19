"""Minimal company memory ingestion schemas retained for the workflow starter."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ingestion import IngestionWorkflowInput
from app.schemas.graph_enrichment import SemanticGraphEnrichmentWorkflowInput


class CompanyMemoryIngestionModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class CompanyMemoryIngestionWorkflowInput(CompanyMemoryIngestionModel):
    base: IngestionWorkflowInput
    semantic_graph: SemanticGraphEnrichmentWorkflowInput
    evidence_model_name: str = Field(min_length=1, max_length=200)
    evidence_glean_max: int = Field(default=1, ge=0, le=2)
    max_parallel_evidence_chunks: int = Field(default=4, ge=1, le=16)
