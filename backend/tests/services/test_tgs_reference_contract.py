from app.services.knowledge.retrieval.models import (
    TGSChunkCandidate,
    TGSEntityCandidate,
    TGSFeatures,
    TGSGraph,
    TGSRelationshipCandidate,
    TGSRetrievalConfig,
)
from app.services.knowledge.retrieval.tgs_retriever import TGSRetriever


def _chunk(
    chunk_id: str,
    *,
    score: float,
    entity_ids: tuple[str, ...],
) -> TGSChunkCandidate:
    return TGSChunkCandidate(
        chunk_id=chunk_id,
        source_id=f"source-{chunk_id}",
        semantic_score=score,
        entity_ids=entity_ids,
        token_count=10,
    )


def _relationship(
    relationship_id: str,
    source: str,
    target: str,
    *,
    predicate: str,
    score: float,
    chunk_id: str,
) -> TGSRelationshipCandidate:
    return TGSRelationshipCandidate(
        relationship_id=relationship_id,
        source_entity_id=source,
        target_entity_id=target,
        predicate=predicate,
        polarity="affirmed",
        assertion_ids=(f"assertion-{relationship_id}",),
        source_chunk_ids=(chunk_id,),
        semantic_score=score,
    )


def _config(*, beam_width: int = 2) -> TGSRetrievalConfig:
    return TGSRetrievalConfig(
        beam_depth=1,
        beam_width=beam_width,
        max_neighbors=10,
        top_k_chunks=5,
        top_k_paths=5,
        max_orphan_paths=3,
    )


def test_independent_graph_seed_can_traverse_an_incoming_edge() -> None:
    initial_chunks = (_chunk("text", score=0.9, entity_ids=("text-only",)),)
    graph_chunks = (
        _chunk("subject-evidence", score=0.0, entity_ids=("subject",)),
        _chunk("object-evidence", score=0.0, entity_ids=("object",)),
    )
    graph = TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="subject",
                semantic_score=0.8,
                source_chunk_ids=("subject-evidence",),
            ),
            TGSEntityCandidate(
                entity_id="object",
                semantic_score=0.95,
                source_chunk_ids=("object-evidence",),
            ),
        ),
        relationships=(
            _relationship(
                "subject-to-object",
                "subject",
                "object",
                predicate="publishes_to",
                score=0.85,
                chunk_id="subject-evidence",
            ),
        ),
    )

    result = TGSRetriever.run(
        seed_entity_ids=("object",),
        initial_chunks=initial_chunks,
        graph_chunks=graph_chunks,
        graph=graph,
        config=_config(),
        features=TGSFeatures(),
    )

    assert result.selected_paths[0].entity_ids == ("object", "subject")
    assert result.selected_paths[0].relationship_ids == ("subject-to-object",)
    relationship = graph.relationships[0]
    assert relationship.source_entity_id == "subject"
    assert relationship.target_entity_id == "object"


def test_global_voting_admits_graph_only_chunks_from_pruned_memory() -> None:
    initial_chunks = (_chunk("initial", score=0.8, entity_ids=("seed",)),)
    graph_chunks = (
        _chunk("selected", score=0.0, entity_ids=("selected",)),
        _chunk("pruned", score=0.0, entity_ids=("pruned",)),
    )
    graph = TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="seed", semantic_score=1.0, source_chunk_ids=("initial",)
            ),
            TGSEntityCandidate(
                entity_id="selected",
                semantic_score=0.9,
                source_chunk_ids=("selected",),
            ),
            TGSEntityCandidate(
                entity_id="pruned",
                semantic_score=0.8,
                source_chunk_ids=("pruned",),
            ),
        ),
        relationships=(
            _relationship(
                "selected-edge",
                "seed",
                "selected",
                predicate="selects",
                score=0.9,
                chunk_id="selected",
            ),
            _relationship(
                "pruned-edge",
                "seed",
                "pruned",
                predicate="also_considers",
                score=0.8,
                chunk_id="pruned",
            ),
        ),
    )

    full = TGSRetriever.run(
        seed_entity_ids=("seed",),
        initial_chunks=initial_chunks,
        graph_chunks=graph_chunks,
        graph=graph,
        config=_config(beam_width=1),
        features=TGSFeatures(graph_to_text=True, text_to_graph=False),
    )
    ablated = TGSRetriever.run(
        seed_entity_ids=("seed",),
        initial_chunks=initial_chunks,
        graph_chunks=graph_chunks,
        graph=graph,
        config=_config(beam_width=1),
        features=TGSFeatures(graph_to_text=False, text_to_graph=False),
    )

    assert full.chunk("pruned").graph_vote_count == 1
    assert "pruned" not in {item.chunk_id for item in ablated.ranked_chunks}
    assert {item.entity_id for item in full.visited_memory} == {
        "seed",
        "selected",
        "pruned",
    }


def test_parallel_directed_predicates_remain_distinct_paths() -> None:
    chunks = (
        _chunk("seed", score=0.9, entity_ids=("seed",)),
        _chunk("target", score=0.5, entity_ids=("target",)),
    )
    graph = TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="seed", semantic_score=1.0, source_chunk_ids=("seed",)
            ),
            TGSEntityCandidate(
                entity_id="target", semantic_score=0.9, source_chunk_ids=("target",)
            ),
        ),
        relationships=(
            _relationship(
                "deploys",
                "seed",
                "target",
                predicate="deploys",
                score=0.9,
                chunk_id="target",
            ),
            _relationship(
                "owns",
                "seed",
                "target",
                predicate="owns",
                score=0.8,
                chunk_id="target",
            ),
        ),
    )

    result = TGSRetriever.run(
        seed_entity_ids=("seed",),
        initial_chunks=chunks,
        graph_chunks=(),
        graph=graph,
        config=_config(),
        features=TGSFeatures(),
    )

    assert {path.relationship_ids for path in result.selected_paths} == {
        ("deploys",),
        ("owns",),
    }


def test_ablations_share_inputs_and_do_not_change_graph_expansion() -> None:
    chunks = (
        _chunk("seed", score=0.9, entity_ids=("seed", "target")),
        _chunk("target", score=0.5, entity_ids=("target",)),
    )
    graph = TGSGraph(
        entities=(
            TGSEntityCandidate(
                entity_id="seed", semantic_score=1.0, source_chunk_ids=("seed",)
            ),
            TGSEntityCandidate(
                entity_id="target", semantic_score=0.8, source_chunk_ids=("target",)
            ),
        ),
        relationships=(
            _relationship(
                "edge",
                "seed",
                "target",
                predicate="connects",
                score=0.8,
                chunk_id="target",
            ),
        ),
    )
    runs = tuple(
        TGSRetriever.run(
            seed_entity_ids=("seed",),
            initial_chunks=chunks,
            graph_chunks=(),
            graph=graph,
            config=_config(),
            features=features,
        )
        for features in (
            TGSFeatures(),
            TGSFeatures(graph_to_text=False),
            TGSFeatures(text_to_graph=False),
        )
    )

    assert {run.graph_expansion_count for run in runs} == {1}
    assert {
        tuple(item.entity_id for item in run.visited_memory) for run in runs
    } == {("seed", "target")}
