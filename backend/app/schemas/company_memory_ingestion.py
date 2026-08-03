"""References-only contracts for the complete Company Memory ingestion path."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.enrichment import EvidenceExtractionWorkflowResult
from app.schemas.graph_enrichment import (
    GraphSnapshotPublishResult,
    SemanticGraphEnrichmentWorkflowInput,
)
from app.schemas.ingestion_v2 import (
    IngestionWorkflowV2Input,
    IngestionWorkflowV2Output,
)


class CompanyMemoryIngestionModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class CompanyMemoryIngestionWorkflowInput(CompanyMemoryIngestionModel):
    base: IngestionWorkflowV2Input
    semantic_graph: SemanticGraphEnrichmentWorkflowInput
    evidence_extractor_version: str = Field(
        default="evidence-v2", min_length=1, max_length=200
    )
    evidence_model_name: str = Field(min_length=1, max_length=200)
    evidence_glean_max: int = Field(default=1, ge=0, le=2)
    evidence_batch_size: int = Field(default=20, ge=1, le=100)
    max_parallel_evidence_chunks: int = Field(default=4, ge=1, le=16)
    max_evidence_chunks: int = Field(default=5_000, ge=1, le=10_000)

    @model_validator(mode="after")
    def validate_workspace(self) -> CompanyMemoryIngestionWorkflowInput:
        if self.base.source.workspace_id != self.semantic_graph.workspace_id:
            raise ValueError("Base and semantic graph workspace IDs must match.")
        return self


class CompanyMemoryIngestionWorkflowResult(CompanyMemoryIngestionModel):
    base: IngestionWorkflowV2Output
    evidence: EvidenceExtractionWorkflowResult
    graph: GraphSnapshotPublishResult
