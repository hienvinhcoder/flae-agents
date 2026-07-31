import pytest

from app.core.exceptions import InvalidArgumentError
from app.services.knowalge_base.tgs_models import (
    TGSChunkCandidate,
    TGSEntityCandidate,
    TGSFeatures,
    TGSGraph,
    TGSRelationshipCandidate,
    TGSRetrievalConfig,
)
from app.services.knowalge_base.tgs_retriever import TGSRetriever


def _graph() -> TGSGraph:
    return TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="entity-seed",
                semantic_score=1.0,
                source_chunk_ids=("chunk-seed",),
            ),
            TGSEntityCandidate(
                entity_id="entity-selected",
                semantic_score=0.9,
                source_chunk_ids=("chunk-selected",),
            ),
            TGSEntityCandidate(
                entity_id="entity-pruned",
                semantic_score=0.8,
                source_chunk_ids=("chunk-pruned",),
            ),
        ),
        relationships=(
            TGSRelationshipCandidate(
                relationship_id="relationship-selected",
                source_entity_id="entity-seed",
                target_entity_id="entity-selected",
                predicate="selects",
                polarity="affirmed",
                assertion_ids=("assertion-selected",),
                source_chunk_ids=("chunk-selected",),
                semantic_score=0.9,
            ),
            TGSRelationshipCandidate(
                relationship_id="relationship-pruned",
                source_entity_id="entity-seed",
                target_entity_id="entity-pruned",
                predicate="also_considers",
                polarity="affirmed",
                assertion_ids=("assertion-pruned",),
                source_chunk_ids=("chunk-pruned",),
                semantic_score=0.8,
            ),
        ),
    )


def _chunks() -> tuple[TGSChunkCandidate, ...]:
    return (
        TGSChunkCandidate(
            chunk_id="chunk-seed",
            source_id="source-seed",
            semantic_score=0.95,
            entity_ids=("entity-seed", "entity-pruned"),
            token_count=8,
        ),
        TGSChunkCandidate(
            chunk_id="chunk-selected",
            source_id="source-selected",
            semantic_score=0.45,
            entity_ids=("entity-selected",),
            token_count=8,
        ),
        TGSChunkCandidate(
            chunk_id="chunk-pruned",
            source_id="source-pruned",
            semantic_score=0.4,
            entity_ids=("entity-pruned",),
            token_count=8,
        ),
    )


def _config() -> TGSRetrievalConfig:
    return TGSRetrievalConfig(
        beam_depth=1,
        beam_width=1,
        max_neighbors=10,
        top_k_chunks=3,
        top_k_paths=3,
        max_orphan_paths=2,
    )


def test_semantic_beam_records_every_candidate_before_pruning() -> None:
    result = TGSRetriever.run(
        seed_entity_ids=("entity-seed",),
        initial_chunks=_chunks(),
        graph=_graph(),
        config=_config(),
        features=TGSFeatures(),
    )

    assert {item.entity_id for item in result.visited_memory} == {
        "entity-seed",
        "entity-selected",
        "entity-pruned",
    }
    assert result.selected_paths[0].entity_ids == (
        "entity-seed",
        "entity-selected",
    )
    assert result.visited("entity-pruned").entity_ids == (
        "entity-seed",
        "entity-pruned",
    )


def test_graph_to_text_uses_pruned_authorized_nodes_for_voting() -> None:
    full = TGSRetriever.run(
        seed_entity_ids=("entity-seed",),
        initial_chunks=_chunks(),
        graph=_graph(),
        config=_config(),
        features=TGSFeatures(graph_to_text=True, text_to_graph=False),
    )
    ablated = TGSRetriever.run(
        seed_entity_ids=("entity-seed",),
        initial_chunks=_chunks(),
        graph=_graph(),
        config=_config(),
        features=TGSFeatures(graph_to_text=False, text_to_graph=False),
    )

    assert full.chunk("chunk-pruned").graph_vote_count == 1
    assert full.chunk("chunk-pruned").score > ablated.chunk("chunk-pruned").score
    assert ablated.chunk("chunk-pruned").graph_vote_count == 0


def test_text_to_graph_recovers_orphan_only_from_visited_memory() -> None:
    full = TGSRetriever.run(
        seed_entity_ids=("entity-seed",),
        initial_chunks=_chunks(),
        graph=_graph(),
        config=_config(),
        features=TGSFeatures(graph_to_text=False, text_to_graph=True),
    )
    ablated = TGSRetriever.run(
        seed_entity_ids=("entity-seed",),
        initial_chunks=_chunks(),
        graph=_graph(),
        config=_config(),
        features=TGSFeatures(graph_to_text=False, text_to_graph=False),
    )

    assert [path.entity_ids for path in full.orphan_paths] == [
        ("entity-seed", "entity-pruned")
    ]
    assert full.orphan_paths[0].assertion_ids == ("assertion-pruned",)
    assert ablated.orphan_paths == ()
    assert full.graph_expansion_count == ablated.graph_expansion_count == 1


def test_tgs_rejects_dangling_or_unauthorized_graph_candidates() -> None:
    graph = _graph().model_copy(
        update={
            "relationships": _graph().relationships
            + (
                TGSRelationshipCandidate(
                    relationship_id="relationship-private",
                    source_entity_id="entity-seed",
                    target_entity_id="entity-not-authorized",
                    predicate="private_link",
                    polarity="affirmed",
                    assertion_ids=("assertion-private",),
                    source_chunk_ids=("chunk-private",),
                    semantic_score=1.0,
                ),
            )
        }
    )

    with pytest.raises(InvalidArgumentError, match="authorized entity set"):
        TGSRetriever.run(
            seed_entity_ids=("entity-seed",),
            initial_chunks=_chunks(),
            graph=graph,
            config=_config(),
            features=TGSFeatures(),
        )
