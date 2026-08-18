"""Typed, storage-independent contracts for faithful TGS retrieval."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.agent_memory import AssertionPolarity


class TGSModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class TGSFeatures(TGSModel):
    graph_to_text: bool = True
    text_to_graph: bool = True


class TGSRetrievalConfig(TGSModel):
    beam_depth: int = Field(default=2, ge=0, le=10)
    beam_width: int = Field(default=20, ge=1, le=100)
    max_neighbors: int = Field(default=30, ge=1, le=100)
    top_k_chunks: int = Field(default=5, ge=1, le=100)
    top_k_paths: int = Field(default=10, ge=1, le=100)
    max_orphan_paths: int = Field(default=3, ge=0, le=20)
    graph_vote_weight: float = Field(default=0.1, ge=0.0, le=10.0)


class TGSChunkCandidate(TGSModel):
    chunk_id: str = Field(min_length=1, max_length=500)
    source_id: str = Field(min_length=1, max_length=500)
    semantic_score: float
    entity_ids: tuple[str, ...] = Field(default=(), max_length=10_000)
    token_count: int = Field(ge=0)


class TGSEntityCandidate(TGSModel):
    entity_id: str = Field(min_length=1, max_length=500)
    semantic_score: float
    source_chunk_ids: tuple[str, ...] = Field(default=(), max_length=10_000)


class TGSRelationshipCandidate(TGSModel):
    relationship_id: str = Field(min_length=1, max_length=500)
    source_entity_id: str = Field(min_length=1, max_length=500)
    target_entity_id: str = Field(min_length=1, max_length=500)
    predicate: str = Field(min_length=1, max_length=200)
    polarity: AssertionPolarity
    assertion_ids: tuple[str, ...] = Field(min_length=1, max_length=10_000)
    source_chunk_ids: tuple[str, ...] = Field(min_length=1, max_length=10_000)
    semantic_score: float


class TGSGraph(TGSModel):
    entities: tuple[TGSEntityCandidate, ...]
    relationships: tuple[TGSRelationshipCandidate, ...]

    @model_validator(mode="after")
    def validate_unique_ids(self) -> TGSGraph:
        entity_ids = [item.entity_id for item in self.entities]
        relationship_ids = [item.relationship_id for item in self.relationships]
        if len(entity_ids) != len(set(entity_ids)):
            raise ValueError("TGS entity IDs must be unique")
        if len(relationship_ids) != len(set(relationship_ids)):
            raise ValueError("TGS relationship IDs must be unique")
        return self


class TGSVisitedNode(TGSModel):
    entity_id: str
    score: float
    entity_ids: tuple[str, ...] = Field(min_length=1, max_length=20)
    relationship_ids: tuple[str, ...] = Field(default=(), max_length=20)
    assertion_ids: tuple[str, ...] = Field(default=(), max_length=20)
    source_chunk_ids: tuple[str, ...] = Field(default=(), max_length=10_000)


class TGSPathCandidate(TGSModel):
    entity_ids: tuple[str, ...] = Field(min_length=1, max_length=20)
    relationship_ids: tuple[str, ...] = Field(default=(), max_length=20)
    assertion_ids: tuple[str, ...] = Field(default=(), max_length=20)
    score: float
    origin: Literal["selected", "orphan_memory"]

    @model_validator(mode="after")
    def validate_hops(self) -> TGSPathCandidate:
        hop_count = len(self.entity_ids) - 1
        if len(self.relationship_ids) != hop_count:
            raise ValueError("TGS path requires one relationship per hop")
        if len(self.assertion_ids) != hop_count:
            raise ValueError("TGS path requires one assertion per hop")
        return self


class TGSChunkScore(TGSModel):
    chunk_id: str
    source_id: str
    score: float
    semantic_score: float
    graph_vote_count: int = Field(ge=0)
    match_signals: tuple[str, ...]
    token_count: int = Field(ge=0)


class TGSRetrievalResult(TGSModel):
    selected_paths: tuple[TGSPathCandidate, ...]
    orphan_paths: tuple[TGSPathCandidate, ...]
    ranked_chunks: tuple[TGSChunkScore, ...]
    visited_memory: tuple[TGSVisitedNode, ...]
    graph_expansion_count: int = Field(ge=0)

    def visited(self, entity_id: str) -> TGSVisitedNode:
        return next(item for item in self.visited_memory if item.entity_id == entity_id)

    def chunk(self, chunk_id: str) -> TGSChunkScore:
        return next(item for item in self.ranked_chunks if item.chunk_id == chunk_id)
