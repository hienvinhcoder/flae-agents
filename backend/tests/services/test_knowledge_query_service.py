from app.schemas.agent_memory import FacetState
from app.schemas.memory_query import MemoryQueryBudget, MemoryQueryRequest, MemoryReadiness
from app.services.knowalge_base.knowledge_query_service import (
    KnowledgeQueryService,
    TGSQueryData,
)
from app.services.knowalge_base.tgs_models import (
    TGSChunkCandidate,
    TGSEntityCandidate,
    TGSGraph,
    TGSRelationshipCandidate,
)


class FakeAuthorizedRepository:
    def __init__(self, data: TGSQueryData) -> None:
        self._data = data

    async def load_query_data(self, query: str, candidate_limit: int) -> TGSQueryData:
        assert query
        assert candidate_limit <= 100
        return self._data


def _data(*, graph_ready: bool = True) -> TGSQueryData:
    chunks = (
        TGSChunkCandidate(
            chunk_id="chunk-a",
            source_id="source-a",
            semantic_score=0.9,
            entity_ids=("entity-a",),
            token_count=8,
        ),
        TGSChunkCandidate(
            chunk_id="chunk-b",
            source_id="source-b",
            semantic_score=0.8,
            entity_ids=("entity-b",),
            token_count=8,
        ),
    )
    graph = TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="entity-a", semantic_score=1.0,
                source_chunk_ids=("chunk-a",),
            ),
            TGSEntityCandidate(
                entity_id="entity-b", semantic_score=0.9,
                source_chunk_ids=("chunk-b",),
            ),
        ),
        relationships=(
            TGSRelationshipCandidate(
                relationship_id="relationship-a-b",
                source_entity_id="entity-a",
                target_entity_id="entity-b",
                predicate="supports",
                polarity="affirmed",
                assertion_ids=("assertion-a-b",),
                source_chunk_ids=("chunk-a",),
                semantic_score=0.9,
            ),
        ),
    )
    return TGSQueryData(
        readiness=MemoryReadiness(
            base=FacetState.ready,
            graph=FacetState.ready if graph_ready else FacetState.failed,
            graph_snapshot_id="snapshot-1" if graph_ready else None,
        ),
        chunks=chunks,
        chunk_content={
            "chunk-a": {
                "source_name": "Architecture ADR",
                "resource_uri": "flae://workspace/ws/chunks/chunk-a",
                "content": "A supports B.",
            },
            "chunk-b": {
                "source_name": "Runbook",
                "resource_uri": "flae://workspace/ws/chunks/chunk-b",
                "content": "B is deployed.",
            },
        },
        graph=graph if graph_ready else None,
        seed_entity_ids=("entity-a",) if graph_ready else (),
        citations={
            "assertion-a-b": (
                {
                    "assertion_id": "assertion-a-b",
                    "revision_id": "revision-a",
                    "chunk_id": "chunk-a",
                    "resource_uri": "flae://workspace/ws/chunks/chunk-a",
                    "evidence_start": 0,
                    "evidence_end": 13,
                    "source_id": "source-a",
                    "source_name": "Architecture ADR",
                },
            )
        },
    )


async def test_search_applies_deterministic_token_budget_and_preserves_hop_citations() -> None:
    service = KnowledgeQueryService(FakeAuthorizedRepository(_data()))
    result = await service.search(
        MemoryQueryRequest(
            query="How does A support B?",
            budget=MemoryQueryBudget(
                max_chunks=2,
                max_paths=2,
                max_hops=2,
                max_context_tokens=12,
                max_citations=2,
            ),
        )
    )

    assert [item.chunk_id for item in result.text_hits] == ["chunk-a"]
    assert result.truncation.chunks_truncated is True
    assert result.truncation.context_tokens_used == 8
    assert result.graph_paths[0].hops[0].citations[0].assertion_id == "assertion-a-b"
    assert result.truncation.citations_truncated is False


async def test_graph_failure_degrades_to_base_hits_without_hiding_readiness() -> None:
    service = KnowledgeQueryService(FakeAuthorizedRepository(_data(graph_ready=False)))
    result = await service.search(MemoryQueryRequest(query="Find deployment evidence"))

    assert result.text_hits
    assert result.graph_paths == ()
    assert result.readiness.base is FacetState.ready
    assert result.readiness.graph is FacetState.failed


async def test_legacy_mapper_is_additive_and_keeps_existing_response_shape() -> None:
    service = KnowledgeQueryService(FakeAuthorizedRepository(_data()))
    result = await service.search(MemoryQueryRequest(query="How does A support B?"))

    legacy = KnowledgeQueryService.to_legacy_result(result)

    assert set(legacy) == {"top_chunks", "top_paths"}
    assert legacy["top_chunks"][0]["id"] == "chunk-a"
    assert legacy["top_paths"][0]["segments"][0]["keywords"] == "supports"
