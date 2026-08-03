"""Typed, ACL-prefiltered loading for independent C and G retrieval channels."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.agent_memory import FacetState
from app.schemas.memory_query import MemoryCitation, MemoryReadiness
from app.services.knowalge_base.canonical_chunk_loader import (
    CanonicalChunkLoader,
    LoadedChunks,
)
from app.services.knowalge_base.knowledge_query_service import TGSChunkContent
from app.services.knowalge_base.tgs_models import (
    TGSChunkCandidate,
    TGSEntityCandidate,
    TGSGraph,
    TGSRelationshipCandidate,
    TGSRetrievalConfig,
)


@dataclass(frozen=True)
class LoadedGraph:
    graph: TGSGraph
    seed_entity_ids: tuple[str, ...]
    chunks: tuple[TGSChunkCandidate, ...]
    content: dict[str, TGSChunkContent]
    citations: dict[str, tuple[MemoryCitation, ...]]


class CanonicalSemanticGraphLoader:
    @staticmethod
    async def load_readiness(
        session: AsyncSession, workspace_id: str
    ) -> tuple[MemoryReadiness, UUID | None]:
        row = (
            await session.execute(
                text(
                    """SELECT
                         EXISTS (
                           SELECT 1 FROM document_revisions
                            WHERE workspace_id = :workspace_id
                              AND state = 'searchable'
                              AND base_readiness = 'ready') AS base_ready,
                         EXISTS (
                           SELECT 1 FROM document_revisions
                            WHERE workspace_id = :workspace_id
                              AND state = 'searchable'
                              AND graph_readiness = 'failed') AS graph_failed,
                         EXISTS (
                           SELECT 1 FROM document_revisions
                            WHERE workspace_id = :workspace_id
                              AND state = 'searchable'
                              AND graph_readiness = 'stale') AS graph_stale,
                         snapshot.snapshot_id,
                         snapshot.semantic_projection_id
                       FROM (SELECT 1) AS singleton
                  LEFT JOIN LATERAL (
                         SELECT snapshot_id, semantic_projection_id
                           FROM graph_snapshots
                          WHERE workspace_id = :workspace_id
                            AND status = 'current'
                            AND semantic_projection_id IS NOT NULL
                          LIMIT 1
                       ) AS snapshot ON true"""
                ),
                {"workspace_id": workspace_id},
            )
        ).mappings().one()
        graph_state = FacetState.pending
        if row["semantic_projection_id"] is not None:
            graph_state = FacetState.ready
        elif row["graph_failed"]:
            graph_state = FacetState.failed
        elif row["graph_stale"]:
            graph_state = FacetState.stale
        readiness = MemoryReadiness(
            base=FacetState.ready if row["base_ready"] else FacetState.pending,
            graph=graph_state,
            graph_snapshot_id=(
                str(row["snapshot_id"]) if row["snapshot_id"] else None
            ),
        )
        return readiness, row["semantic_projection_id"]

    @staticmethod
    async def load_initial_chunks(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        embedding: str,
        limit: int,
    ) -> LoadedChunks:
        rows = (
            await session.execute(
                text(
                    """SELECT chunk.chunk_id, chunk.source_id,
                              chunk.document_id, chunk.revision_id,
                              chunk.source_name, chunk.text, chunk.token_count,
                              1 - (chunk.embedding <=> CAST(:embedding AS vector))
                                AS semantic_score
                         FROM current_chunks AS chunk
                        WHERE chunk.workspace_id = :workspace_id
                          AND chunk.embedding IS NOT NULL
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(
                                    chunk.acl_principal_ids, :subject_id))
                        ORDER BY chunk.embedding <=> CAST(:embedding AS vector),
                                 chunk.chunk_id
                        LIMIT :candidate_limit"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "embedding": embedding,
                    "candidate_limit": limit,
                },
            )
        ).mappings().all()
        return await CanonicalChunkLoader.materialize(
            session,
            workspace_id,
            subject_id,
            rows,
        )

    @staticmethod
    async def load_graph(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        embedding: str,
        semantic_projection_id: UUID,
        config: TGSRetrievalConfig,
    ) -> LoadedGraph:
        seeds = await CanonicalSemanticGraphLoader._load_entities(
            session,
            workspace_id,
            subject_id,
            embedding,
            semantic_projection_id,
            ids=None,
            limit=config.beam_width,
        )
        entities = {item.entity_id: item for item in seeds}
        relationships: dict[str, TGSRelationshipCandidate] = {}
        frontier = tuple(item.entity_id for item in seeds)
        expanded: set[str] = set()
        for _depth in range(config.beam_depth):
            frontier = tuple(item for item in frontier if item not in expanded)
            if not frontier:
                break
            expanded.update(frontier)
            values = await CanonicalSemanticGraphLoader._load_relationships(
                session,
                workspace_id,
                subject_id,
                embedding,
                semantic_projection_id,
                frontier,
                config.max_neighbors * len(frontier),
            )
            relationships.update(
                (item.relationship_id, item) for item in values
            )
            endpoint_ids = {
                entity_id
                for item in values
                for entity_id in (item.source_entity_id, item.target_entity_id)
            }
            missing_ids = tuple(sorted(endpoint_ids - entities.keys()))
            if missing_ids:
                loaded = await CanonicalSemanticGraphLoader._load_entities(
                    session,
                    workspace_id,
                    subject_id,
                    embedding,
                    semantic_projection_id,
                    ids=missing_ids,
                    limit=len(missing_ids),
                )
                entities.update((item.entity_id, item) for item in loaded)
            frontier = tuple(
                item.entity_id
                for item in sorted(
                    (entities[value] for value in endpoint_ids if value in entities),
                    key=lambda item: (-item.semantic_score, item.entity_id),
                )[: config.beam_width]
            )
        graph = TGSGraph(
            entities=tuple(entities[key] for key in sorted(entities)),
            relationships=tuple(
                relationships[key] for key in sorted(relationships)
            ),
        )
        graph_chunk_ids = {
            chunk_id
            for item in graph.entities
            for chunk_id in item.source_chunk_ids
        } | {
            chunk_id
            for item in graph.relationships
            for chunk_id in item.source_chunk_ids
        }
        chunks = await CanonicalChunkLoader.load_by_ids(
            session,
            workspace_id,
            subject_id,
            embedding,
            tuple(sorted(graph_chunk_ids)),
        )
        assertion_ids = tuple(
            sorted(
                {
                    assertion_id
                    for item in graph.relationships
                    for assertion_id in item.assertion_ids
                }
            )
        )
        citations = await CanonicalChunkLoader.load_citations(
            session, workspace_id, subject_id, assertion_ids
        )
        return LoadedGraph(
            graph=graph,
            seed_entity_ids=tuple(item.entity_id for item in seeds),
            chunks=chunks.candidates,
            content=chunks.content,
            citations=citations,
        )

    @staticmethod
    async def _load_entities(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        embedding: str,
        semantic_projection_id: UUID,
        *,
        ids: tuple[str, ...] | None,
        limit: int,
    ) -> tuple[TGSEntityCandidate, ...]:
        id_clause = "" if ids is None else "AND entity.entity_id::text = ANY(:ids)"
        rows = (
            await session.execute(
                text(
                    """SELECT entity.entity_id,
                              1 - (entity.embedding <=> CAST(:embedding AS vector))
                                AS semantic_score,
                              array_agg(DISTINCT mapping.chunk_id)
                                AS source_chunk_ids
                         FROM entity_semantic_versions AS entity
                         JOIN semantic_graph_mappings AS mapping
                           ON mapping.workspace_id = entity.workspace_id
                          AND mapping.semantic_projection_id = entity.semantic_projection_id
                          AND mapping.target_kind = 'entity'
                          AND mapping.target_id = entity.entity_id
                         JOIN current_chunks AS chunk
                           ON chunk.workspace_id = mapping.workspace_id
                          AND chunk.revision_id = mapping.revision_id
                          AND chunk.chunk_id = mapping.chunk_id
                        WHERE entity.workspace_id = :workspace_id
                          AND entity.semantic_projection_id = :semantic_projection_id
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(chunk.acl_principal_ids, :subject_id)) """
                    + id_clause
                    + """ GROUP BY entity.entity_id, entity.embedding
                        ORDER BY entity.embedding <=> CAST(:embedding AS vector),
                                 entity.entity_id
                        LIMIT :candidate_limit"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "embedding": embedding,
                    "semantic_projection_id": semantic_projection_id,
                    "ids": list(ids or ()),
                    "candidate_limit": limit,
                },
            )
        ).mappings().all()
        return tuple(
            TGSEntityCandidate(
                entity_id=str(row["entity_id"]),
                semantic_score=float(row["semantic_score"]),
                source_chunk_ids=tuple(sorted(row["source_chunk_ids"])),
            )
            for row in rows
        )

    @staticmethod
    async def _load_relationships(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        embedding: str,
        semantic_projection_id: UUID,
        frontier_ids: tuple[str, ...],
        limit: int,
    ) -> tuple[TGSRelationshipCandidate, ...]:
        rows = (
            await session.execute(
                text(
                    """SELECT relationship.relationship_id,
                              relationship.subject_entity_id,
                              relationship.object_entity_id,
                              relationship.predicate, relationship.polarity,
                              1 - (relationship.embedding <=> CAST(:embedding AS vector))
                                AS semantic_score,
                              array_agg(DISTINCT mapping.chunk_id)
                                AS source_chunk_ids,
                              array_agg(DISTINCT mapping.evidence_id)
                                AS assertion_ids
                         FROM relationship_semantic_versions AS relationship
                         JOIN semantic_graph_mappings AS mapping
                           ON mapping.workspace_id = relationship.workspace_id
                          AND mapping.semantic_projection_id = relationship.semantic_projection_id
                          AND mapping.target_kind = 'relationship'
                          AND mapping.target_id = relationship.relationship_id
                         JOIN current_chunks AS chunk
                           ON chunk.workspace_id = mapping.workspace_id
                          AND chunk.revision_id = mapping.revision_id
                          AND chunk.chunk_id = mapping.chunk_id
                        WHERE relationship.workspace_id = :workspace_id
                          AND relationship.semantic_projection_id = :semantic_projection_id
                          AND relationship.object_entity_id IS NOT NULL
                          AND (relationship.subject_entity_id::text = ANY(:frontier_ids)
                               OR relationship.object_entity_id::text = ANY(:frontier_ids))
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(chunk.acl_principal_ids, :subject_id))
                        GROUP BY relationship.relationship_id,
                                 relationship.subject_entity_id,
                                 relationship.object_entity_id,
                                 relationship.predicate, relationship.polarity,
                                 relationship.embedding
                        ORDER BY relationship.embedding <=> CAST(:embedding AS vector),
                                 relationship.relationship_id
                        LIMIT :candidate_limit"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "embedding": embedding,
                    "semantic_projection_id": semantic_projection_id,
                    "frontier_ids": list(frontier_ids),
                    "candidate_limit": limit,
                },
            )
        ).mappings().all()
        return tuple(
            TGSRelationshipCandidate(
                relationship_id=str(row["relationship_id"]),
                source_entity_id=str(row["subject_entity_id"]),
                target_entity_id=str(row["object_entity_id"]),
                predicate=row["predicate"],
                polarity=row["polarity"],
                assertion_ids=tuple(
                    sorted(str(value) for value in row["assertion_ids"])
                ),
                source_chunk_ids=tuple(sorted(row["source_chunk_ids"])),
                semantic_score=float(row["semantic_score"]),
            )
            for row in rows
        )
