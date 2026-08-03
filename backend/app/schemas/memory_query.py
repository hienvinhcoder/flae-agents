"""Transport-independent, evidence-backed Company Memory query contracts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.agent_memory import AssertionPolarity, EvidenceProvenance, FacetState
from app.services.knowalge_base.tgs_models import TGSFeatures


class MemoryQueryModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class MemoryQueryBudget(MemoryQueryModel):
    max_chunks: int = Field(default=5, ge=1, le=100)
    max_paths: int = Field(default=10, ge=0, le=100)
    max_hops: int = Field(default=4, ge=0, le=10)
    max_context_tokens: int = Field(default=4_000, ge=1, le=100_000)
    max_citations: int = Field(default=100, ge=1, le=10_000)


class MemoryQueryRequest(MemoryQueryModel):
    query: str = Field(min_length=1, max_length=4_000)
    budget: MemoryQueryBudget = MemoryQueryBudget()
    features: TGSFeatures = TGSFeatures()


class MemoryReadiness(MemoryQueryModel):
    base: FacetState
    graph: FacetState
    graph_snapshot_id: str | None = None


class MemoryCitation(MemoryQueryModel):
    assertion_id: str
    revision_id: str
    chunk_id: str
    resource_uri: str
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    source_id: str
    source_name: str
    provenance: EvidenceProvenance | None = None


class MemoryTextHit(MemoryQueryModel):
    chunk_id: str
    source_id: str
    source_name: str
    resource_uri: str
    content: str
    score: float
    token_count: int = Field(ge=0)
    match_signals: tuple[str, ...]
    provenance: EvidenceProvenance | None = None


class MemoryGraphHop(MemoryQueryModel):
    source_entity_id: str
    target_entity_id: str
    predicate: str
    polarity: AssertionPolarity
    citations: tuple[MemoryCitation, ...] = Field(min_length=1)


class MemoryGraphPath(MemoryQueryModel):
    path_id: str
    hops: tuple[MemoryGraphHop, ...] = Field(min_length=1)
    score: float
    origin: Literal["selected", "orphan_memory"]

    @model_validator(mode="after")
    def validate_continuity(self) -> MemoryGraphPath:
        for previous, current in zip(self.hops, self.hops[1:], strict=False):
            if previous.target_entity_id != current.source_entity_id:
                raise ValueError("memory graph path must be continuous")
        return self


class MemoryTruncation(MemoryQueryModel):
    chunks_truncated: bool
    paths_truncated: bool
    citations_truncated: bool
    context_tokens_used: int = Field(ge=0)
    citations_used: int = Field(ge=0)


class MemorySearchResult(MemoryQueryModel):
    query: str
    text_hits: tuple[MemoryTextHit, ...]
    graph_paths: tuple[MemoryGraphPath, ...]
    readiness: MemoryReadiness
    truncation: MemoryTruncation


class MemoryEvidenceExplanation(MemoryQueryModel):
    citation: MemoryCitation
    excerpt: str
