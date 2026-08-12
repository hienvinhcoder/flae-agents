"""Pure implementation of semantic beam, graph voting, and orphan recovery."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Literal

from app.core.exceptions import InvalidArgumentError
from app.services.knowledge.retrieval.models import (
    TGSChunkCandidate,
    TGSChunkScore,
    TGSFeatures,
    TGSGraph,
    TGSPathCandidate,
    TGSRelationshipCandidate,
    TGSRetrievalConfig,
    TGSRetrievalResult,
    TGSVisitedNode,
)


class TGSRetriever:
    @staticmethod
    def run(
        *,
        seed_entity_ids: tuple[str, ...],
        initial_chunks: tuple[TGSChunkCandidate, ...],
        graph: TGSGraph,
        config: TGSRetrievalConfig,
        features: TGSFeatures,
        graph_chunks: tuple[TGSChunkCandidate, ...] = (),
    ) -> TGSRetrievalResult:
        entities = {item.entity_id: item for item in graph.entities}
        TGSRetriever._validate_authorized_graph(
            seed_entity_ids,
            initial_chunks,
            graph_chunks,
            graph,
            set(entities),
        )
        adjacency: dict[
            str, list[tuple[TGSRelationshipCandidate, str]]
        ] = defaultdict(list)
        for relationship in graph.relationships:
            adjacency[relationship.source_entity_id].append(
                (relationship, relationship.target_entity_id)
            )
            adjacency[relationship.target_entity_id].append(
                (relationship, relationship.source_entity_id)
            )
        for neighbors in adjacency.values():
            neighbors.sort(
                key=lambda item: (
                    -item[0].semantic_score,
                    item[0].relationship_id,
                    item[1],
                )
            )

        visited = {
            entity_id: TGSVisitedNode(
                entity_id=entity_id,
                score=entities[entity_id].semantic_score,
                entity_ids=(entity_id,),
                source_chunk_ids=entities[entity_id].source_chunk_ids,
            )
            for entity_id in sorted(set(seed_entity_ids))
        }
        current = tuple(visited.values())
        selected: dict[
            tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]],
            TGSPathCandidate,
        ] = {}
        expansion_count = 0
        for _depth in range(config.beam_depth):
            candidates: list[TGSVisitedNode] = []
            if not current:
                break
            expansion_count += 1
            for beam in current:
                neighbors = adjacency.get(beam.entity_id, ())[: config.max_neighbors]
                for relationship, target_id in neighbors:
                    if target_id in beam.entity_ids:
                        continue
                    target = entities[target_id]
                    score = (target.semantic_score + relationship.semantic_score) / 2.0
                    candidate = TGSVisitedNode(
                        entity_id=target_id,
                        score=score,
                        entity_ids=beam.entity_ids + (target_id,),
                        relationship_ids=(
                            beam.relationship_ids + (relationship.relationship_id,)
                        ),
                        assertion_ids=(
                            beam.assertion_ids + (relationship.assertion_ids[0],)
                        ),
                        source_chunk_ids=target.source_chunk_ids,
                    )
                    # Every explored candidate enters memory before beam pruning.
                    previous = visited.get(target_id)
                    if previous is None or TGSRetriever._better(candidate, previous):
                        visited[target_id] = candidate
                    candidates.append(candidate)
            candidates.sort(key=TGSRetriever._rank_key)
            current = tuple(candidates[: config.beam_width])
            for candidate in current:
                path = TGSRetriever._as_path(candidate, origin="selected")
                selected[
                    (path.entity_ids, path.relationship_ids, path.assertion_ids)
                ] = path

        selected_paths = tuple(
            sorted(selected.values(), key=TGSRetriever._path_rank_key)[
                : config.top_k_paths
            ]
        )
        votes: Counter[str] = Counter()
        if features.graph_to_text:
            for record in visited.values():
                votes.update(set(record.source_chunk_ids))
        ranked_chunks = TGSRetriever._rank_chunks(
            initial_chunks, graph_chunks, votes, config
        )
        orphan_paths = TGSRetriever._recover_orphans(
            initial_chunks,
            selected_paths,
            visited,
            config,
            enabled=features.text_to_graph,
        )
        return TGSRetrievalResult(
            selected_paths=selected_paths,
            orphan_paths=orphan_paths,
            ranked_chunks=ranked_chunks,
            visited_memory=tuple(
                visited[key] for key in sorted(visited)
            ),
            graph_expansion_count=expansion_count,
        )

    @staticmethod
    def _recover_orphans(
        chunks: tuple[TGSChunkCandidate, ...],
        selected_paths: tuple[TGSPathCandidate, ...],
        visited: dict[str, TGSVisitedNode],
        config: TGSRetrievalConfig,
        *,
        enabled: bool,
    ) -> tuple[TGSPathCandidate, ...]:
        if not enabled or config.max_orphan_paths == 0:
            return ()
        text_entities = {
            entity_id for chunk in chunks for entity_id in chunk.entity_ids
        }
        selected_entities = {
            entity_id for path in selected_paths for entity_id in path.entity_ids
        }
        candidates = [
            TGSRetriever._as_path(visited[entity_id], origin="orphan_memory")
            for entity_id in text_entities - selected_entities
            if entity_id in visited and len(visited[entity_id].entity_ids) > 1
        ]
        unique = {item.entity_ids: item for item in candidates}
        return tuple(
            sorted(unique.values(), key=TGSRetriever._path_rank_key)[
                : config.max_orphan_paths
            ]
        )

    @staticmethod
    def _rank_chunks(
        initial_chunks: tuple[TGSChunkCandidate, ...],
        graph_chunks: tuple[TGSChunkCandidate, ...],
        votes: Counter[str],
        config: TGSRetrievalConfig,
    ) -> tuple[TGSChunkScore, ...]:
        candidates = {item.chunk_id: item for item in initial_chunks}
        initial_ids = set(candidates)
        for chunk in graph_chunks:
            existing = candidates.get(chunk.chunk_id)
            if existing is not None and existing != chunk:
                raise InvalidArgumentError(
                    "Authorized chunk ID maps to conflicting retrieval data."
                )
            if votes[chunk.chunk_id] > 0:
                candidates[chunk.chunk_id] = chunk
        ranked = tuple(
            TGSChunkScore(
                chunk_id=chunk.chunk_id,
                source_id=chunk.source_id,
                semantic_score=chunk.semantic_score,
                graph_vote_count=votes[chunk.chunk_id],
                score=(
                    chunk.semantic_score
                    + config.graph_vote_weight * votes[chunk.chunk_id]
                ),
                match_signals=TGSRetriever._chunk_signals(
                    chunk.chunk_id in initial_ids, votes[chunk.chunk_id] > 0
                ),
                token_count=chunk.token_count,
            )
            for chunk in candidates.values()
        )
        return tuple(
            sorted(ranked, key=lambda item: (-item.score, item.chunk_id))[
                : config.top_k_chunks
            ]
        )

    @staticmethod
    def _as_path(
        item: TGSVisitedNode, *, origin: Literal["selected", "orphan_memory"]
    ) -> TGSPathCandidate:
        return TGSPathCandidate(
            entity_ids=item.entity_ids,
            relationship_ids=item.relationship_ids,
            assertion_ids=item.assertion_ids,
            score=item.score,
            origin=origin,
        )

    @staticmethod
    def _validate_authorized_graph(
        seeds: tuple[str, ...],
        initial_chunks: tuple[TGSChunkCandidate, ...],
        graph_chunks: tuple[TGSChunkCandidate, ...],
        graph: TGSGraph,
        entity_ids: set[str],
    ) -> None:
        referenced = {
            value
            for relationship in graph.relationships
            for value in (
                relationship.source_entity_id,
                relationship.target_entity_id,
            )
        }
        if not set(seeds) <= entity_ids or not referenced <= entity_ids:
            raise InvalidArgumentError(
                "TGS graph references an entity outside the authorized entity set."
            )
        chunk_ids = {
            item.chunk_id for item in (*initial_chunks, *graph_chunks)
        }
        referenced_graph_chunk_ids = {
            chunk_id
            for entity in graph.entities
            for chunk_id in entity.source_chunk_ids
        } | {
            chunk_id
            for relationship in graph.relationships
            for chunk_id in relationship.source_chunk_ids
        }
        if not referenced_graph_chunk_ids <= chunk_ids:
            raise InvalidArgumentError(
                "TGS graph references a chunk outside the authorized chunk set."
            )

    @staticmethod
    def _chunk_signals(
        is_initial: bool, has_graph_vote: bool
    ) -> tuple[str, ...]:
        if is_initial and has_graph_vote:
            return ("semantic", "graph_vote")
        if is_initial:
            return ("semantic",)
        return ("graph_vote",)

    @staticmethod
    def _better(candidate: TGSVisitedNode, previous: TGSVisitedNode) -> bool:
        return TGSRetriever._rank_key(candidate) < TGSRetriever._rank_key(previous)

    @staticmethod
    def _rank_key(item: TGSVisitedNode) -> tuple[float, int, tuple[str, ...]]:
        return (-item.score, len(item.entity_ids), item.entity_ids)

    @staticmethod
    def _path_rank_key(
        item: TGSPathCandidate,
    ) -> tuple[float, int, tuple[str, ...]]:
        return (-item.score, len(item.entity_ids), item.entity_ids)
