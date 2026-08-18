"""Evidence-backed Company Memory search capability independent from adapters."""

from __future__ import annotations

from hashlib import sha256
import json
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.agent_memory import EvidenceProvenance, FacetState
from app.schemas.memory_query import (
    MemoryCitation,
    MemoryEvidenceExplanation,
    MemoryGraphHop,
    MemoryGraphPath,
    MemoryQueryRequest,
    MemoryReadiness,
    MemorySearchResult,
    MemoryTextHit,
    MemoryTruncation,
)
from app.services.knowledge.retrieval.models import (
    TGSChunkCandidate,
    TGSGraph,
    TGSPathCandidate,
    TGSRetrievalConfig,
)
from app.services.knowledge.retrieval.tgs_retriever import TGSRetriever


class QueryDataModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class TGSChunkContent(QueryDataModel):
    source_name: str
    resource_uri: str
    content: str
    provenance: EvidenceProvenance | None = None


class TGSQueryData(QueryDataModel):
    readiness: MemoryReadiness
    chunks: tuple[TGSChunkCandidate, ...]
    graph_chunks: tuple[TGSChunkCandidate, ...] = ()
    chunk_content: dict[str, TGSChunkContent]
    graph: TGSGraph | None = None
    seed_entity_ids: tuple[str, ...] = ()
    citations: dict[str, tuple[MemoryCitation, ...]] = Field(default_factory=dict)


class AuthorizedQueryRepository(Protocol):
    async def load_query_data(
        self, query: str, candidate_limit: int
    ) -> TGSQueryData: ...

    async def resolve_assertion(
        self, assertion_id: str
    ) -> MemoryEvidenceExplanation: ...


class KnowledgeQueryService:
    def __init__(self, repository: AuthorizedQueryRepository) -> None:
        self._repository = repository

    async def search(self, request: MemoryQueryRequest) -> MemorySearchResult:
        candidate_limit = min(100, max(request.budget.max_chunks * 4, 20))
        data = await self._repository.load_query_data(
            request.query, candidate_limit
        )
        graph_available = (
            data.graph is not None and data.readiness.graph is FacetState.ready
        )
        graph = (
            data.graph
            if graph_available and data.graph is not None
            else TGSGraph(entities=(), relationships=())
        )
        run = TGSRetriever.run(
            seed_entity_ids=data.seed_entity_ids if graph_available else (),
            initial_chunks=data.chunks,
            graph_chunks=data.graph_chunks if graph_available else (),
            graph=graph,
            config=TGSRetrievalConfig(
                beam_depth=request.budget.max_hops,
                top_k_chunks=min(
                    request.budget.max_chunks,
                    len(data.chunks) + len(data.graph_chunks) or 1,
                ),
                top_k_paths=max(1, request.budget.max_paths or 1),
                max_orphan_paths=(
                    min(20, request.budget.max_paths)
                    if request.features.text_to_graph
                    else 0
                ),
            ),
            features=request.features,
        )
        text_hits, tokens_used, chunks_truncated = self._bounded_text_hits(
            run.ranked_chunks, data, request
        )
        graph_paths, citations_used, citation_truncated = self._bounded_paths(
            run.selected_paths + run.orphan_paths, data, request
        )
        path_candidates = len(run.selected_paths) + len(run.orphan_paths)
        return MemorySearchResult(
            query=request.query,
            text_hits=text_hits,
            graph_paths=graph_paths,
            readiness=data.readiness,
            truncation=MemoryTruncation(
                chunks_truncated=chunks_truncated,
                paths_truncated=(
                    citation_truncated or len(graph_paths) < path_candidates
                ),
                citations_truncated=citation_truncated,
                context_tokens_used=tokens_used,
                citations_used=citations_used,
            ),
        )

    async def explain_assertion(
        self, assertion_id: str
    ) -> MemoryEvidenceExplanation:
        return await self._repository.resolve_assertion(assertion_id)

    @staticmethod
    def _bounded_text_hits(run_chunks, data, request):
        hits: list[MemoryTextHit] = []
        tokens_used = 0
        truncated = False
        for chunk in run_chunks:
            content = data.chunk_content.get(chunk.chunk_id)
            if content is None:
                continue
            if tokens_used + chunk.token_count > request.budget.max_context_tokens:
                truncated = True
                break
            hits.append(
                MemoryTextHit(
                    chunk_id=chunk.chunk_id,
                    source_id=chunk.source_id,
                    source_name=content.source_name,
                    resource_uri=content.resource_uri,
                    content=content.content,
                    score=chunk.score,
                    token_count=chunk.token_count,
                    match_signals=chunk.match_signals,
                    provenance=content.provenance,
                )
            )
            tokens_used += chunk.token_count
        if len(hits) < min(request.budget.max_chunks, len(run_chunks)):
            truncated = True
        return tuple(hits), tokens_used, truncated

    @staticmethod
    def _bounded_paths(paths, data, request):
        relationship_map = (
            {item.relationship_id: item for item in data.graph.relationships}
            if data.graph is not None
            else {}
        )
        results: list[MemoryGraphPath] = []
        citations_used = 0
        citations_truncated = False
        for path in paths:
            if len(results) >= request.budget.max_paths:
                break
            hops: list[MemoryGraphHop] = []
            path_citation_count = 0
            valid = True
            for index, relationship_id in enumerate(path.relationship_ids):
                relationship = relationship_map.get(relationship_id)
                assertion_id = path.assertion_ids[index]
                citations = data.citations.get(assertion_id, ())
                if relationship is None or not citations:
                    valid = False
                    break
                path_citation_count += len(citations)
                hops.append(
                    MemoryGraphHop(
                        source_entity_id=path.entity_ids[index],
                        target_entity_id=path.entity_ids[index + 1],
                        predicate=relationship.predicate,
                        polarity=relationship.polarity,
                        citations=citations,
                    )
                )
            if not valid or not hops:
                continue
            if citations_used + path_citation_count > request.budget.max_citations:
                citations_truncated = True
                continue
            results.append(
                MemoryGraphPath(
                    path_id=KnowledgeQueryService._path_id(path),
                    hops=tuple(hops),
                    score=path.score,
                    origin=path.origin,
                )
            )
            citations_used += path_citation_count
        return tuple(results), citations_used, citations_truncated

    @staticmethod
    def _path_id(path: TGSPathCandidate) -> str:
        encoded = json.dumps(
            path.model_dump(mode="json"), separators=(",", ":"), sort_keys=True
        ).encode("utf-8")
        return "path_" + sha256(encoded).hexdigest()[:32]

    @staticmethod
    def to_legacy_result(result: MemorySearchResult) -> dict[str, list[dict[str, object]]]:
        return {
            "top_chunks": [
                {
                    "id": hit.chunk_id,
                    "score": hit.score,
                    "type": "chunk",
                    "name": f"Chunk from {hit.source_name}",
                    "source_document": hit.source_name,
                    "content": hit.content,
                    "reason": ", ".join(hit.match_signals),
                }
                for hit in result.text_hits
            ],
            "top_paths": [
                {
                    "path_readable": "".join(
                        f"{hop.source_entity_id} --[{hop.predicate}]--> "
                        f"{hop.target_entity_id}"
                        for hop in path.hops
                    ),
                    "segments": [
                        {
                            "source": hop.source_entity_id,
                            "target": hop.target_entity_id,
                            "keywords": hop.predicate,
                            "description": hop.predicate,
                            "source_desc": "",
                            "target_desc": "",
                        }
                        for hop in path.hops
                    ],
                    "score": path.score,
                    "reason": path.origin,
                    "entity_ids": [
                        path.hops[0].source_entity_id,
                        *(hop.target_entity_id for hop in path.hops),
                    ],
                    "endorsing_bridges": [],
                }
                for path in result.graph_paths
            ],
        }
