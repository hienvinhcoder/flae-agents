"""RLS- and source-ACL-scoped candidate loader for canonical TGS snapshots."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Awaitable, Callable
import numpy as np
from sqlalchemy import text

from app.core.config import settings
from app.db.rag_db import DBManager
from app.db.rag_repository import AuthorizationContext
from app.schemas.agent_memory import FacetState
from app.schemas.memory_query import MemoryCitation, MemoryReadiness
from app.schemas.memory_query import MemoryEvidenceExplanation
from app.core.exceptions import ResourceNotFoundError
from app.services.knowalge_base.knowledge_query_service import (
    TGSChunkContent,
    TGSQueryData,
)
from app.services.knowalge_base.tgs_models import (
    TGSChunkCandidate,
    TGSEntityCandidate,
    TGSGraph,
    TGSRelationshipCandidate,
)


EmbeddingProvider = Callable[[str], Awaitable[np.ndarray]]


class CanonicalQueryRepository:
    """Loads candidates only through a pre-bound authorization context."""

    def __init__(
        self,
        manager: DBManager,
        authorization: AuthorizationContext,
        embedding_provider: EmbeddingProvider,
    ) -> None:
        self._manager = manager
        self._authorization = authorization
        self._embedding_provider = embedding_provider

    async def load_query_data(
        self, query: str, candidate_limit: int
    ) -> TGSQueryData:
        embedding = await self._embedding_provider(query)
        workspace_id = str(self._authorization.workspace_id)
        subject_id = self._authorization.subject_id
        async with self._manager.get_async_session(
            workspace_id, subject_id
        ) as session:
            chunks = (
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
                        "embedding": str(embedding.tolist()),
                        "candidate_limit": candidate_limit,
                    },
                )
            ).mappings().all()
            snapshot_id = await session.scalar(
                text(
                    """SELECT snapshot_id FROM current_graph_snapshots
                        WHERE workspace_id = :workspace_id"""
                ),
                {"workspace_id": workspace_id},
            )
            if not chunks:
                return TGSQueryData(
                    readiness=MemoryReadiness(
                        base=FacetState.pending,
                        graph=FacetState.pending,
                    ),
                    chunks=(),
                    chunk_content={},
                )
            chunk_ids = [row["chunk_id"] for row in chunks]
            mappings = (
                await session.execute(
                    text(
                        """SELECT mapping.chunk_id, mapping.target_kind,
                                  mapping.target_id, mapping.assertion_id
                             FROM current_graph_mappings AS mapping
                             JOIN current_chunks AS chunk
                               ON chunk.workspace_id = mapping.workspace_id
                              AND chunk.revision_id = mapping.revision_id
                              AND chunk.chunk_id = mapping.chunk_id
                            WHERE mapping.workspace_id = :workspace_id
                              AND mapping.chunk_id = ANY(:chunk_ids)
                              AND (chunk.acl_scope = 'workspace'
                                   OR jsonb_exists(
                                        chunk.acl_principal_ids, :subject_id))
                            ORDER BY mapping.mapping_id"""
                    ),
                    {
                        "workspace_id": workspace_id,
                        "subject_id": subject_id,
                        "chunk_ids": chunk_ids,
                    },
                )
            ).mappings().all()
            entity_ids = sorted(
                {
                    row["target_id"]
                    for row in mappings
                    if row["target_kind"] == "entity"
                },
                key=str,
            )
            relationship_ids = sorted(
                {
                    row["target_id"]
                    for row in mappings
                    if row["target_kind"] == "relationship"
                },
                key=str,
            )
            entities = await self._load_entities(
                session, workspace_id, entity_ids, mappings, chunks
            )
            relationships = await self._load_relationships(
                session, workspace_id, relationship_ids, mappings, chunks
            )
            citations = await self._load_citations(
                session, workspace_id, subject_id, mappings
            )
        entity_ids_by_chunk: dict[str, list[str]] = defaultdict(list)
        for mapping in mappings:
            if mapping["target_kind"] == "entity":
                entity_ids_by_chunk[mapping["chunk_id"]].append(
                    str(mapping["target_id"])
                )
        candidates = tuple(
            TGSChunkCandidate(
                chunk_id=row["chunk_id"],
                source_id=str(row["source_id"]),
                semantic_score=float(row["semantic_score"]),
                entity_ids=tuple(sorted(set(entity_ids_by_chunk[row["chunk_id"]]))),
                token_count=int(row["token_count"] or 0),
            )
            for row in chunks
        )
        graph_ready = snapshot_id is not None
        return TGSQueryData(
            readiness=MemoryReadiness(
                base=FacetState.ready,
                graph=FacetState.ready if graph_ready else FacetState.pending,
                graph_snapshot_id=str(snapshot_id) if snapshot_id else None,
            ),
            chunks=candidates,
            chunk_content={
                row["chunk_id"]: TGSChunkContent(
                    source_name=row["source_name"],
                    resource_uri=(
                        f"flae://workspace/{workspace_id}/documents/"
                        f"{row['document_id']}/revisions/{row['revision_id']}"
                        f"/chunks/{row['chunk_id']}"
                    ),
                    content=row["text"] or "",
                )
                for row in chunks
            },
            graph=(
                TGSGraph(entities=entities, relationships=relationships)
                if graph_ready
                else None
            ),
            seed_entity_ids=tuple(
                item.entity_id
                for item in sorted(
                    entities,
                    key=lambda item: (-item.semantic_score, item.entity_id),
                )[: settings.RAG_RETRIEVAL_TOP_P]
            ),
            citations=citations,
        )

    async def resolve_assertion(
        self, assertion_id: str
    ) -> MemoryEvidenceExplanation:
        workspace_id = str(self._authorization.workspace_id)
        subject_id = self._authorization.subject_id
        async with self._manager.get_async_session(
            workspace_id, subject_id
        ) as session:
            row = (
                await session.execute(
                    text(
                        """SELECT assertion.assertion_id, assertion.revision_id,
                                  assertion.chunk_id, assertion.evidence_start,
                                  assertion.evidence_end, chunk.source_id,
                                  chunk.source_name, chunk.document_id, chunk.text
                             FROM assertion_evidence AS assertion
                             JOIN current_chunks AS chunk
                               ON chunk.workspace_id = assertion.workspace_id
                              AND chunk.revision_id = assertion.revision_id
                              AND chunk.chunk_id = assertion.chunk_id
                            WHERE assertion.workspace_id = :workspace_id
                              AND assertion.assertion_id::text = :assertion_id
                              AND (chunk.acl_scope = 'workspace'
                                   OR jsonb_exists(
                                        chunk.acl_principal_ids, :subject_id))"""
                    ),
                    {
                        "workspace_id": workspace_id,
                        "subject_id": subject_id,
                        "assertion_id": assertion_id,
                    },
                )
            ).mappings().one_or_none()
        if row is None:
            raise ResourceNotFoundError("Memory evidence was not found.")
        citation = MemoryCitation(
            assertion_id=str(row["assertion_id"]),
            revision_id=str(row["revision_id"]),
            chunk_id=row["chunk_id"],
            resource_uri=(
                f"flae://workspace/{workspace_id}/documents/{row['document_id']}"
                f"/revisions/{row['revision_id']}/chunks/{row['chunk_id']}"
            ),
            evidence_start=row["evidence_start"],
            evidence_end=row["evidence_end"],
            source_id=str(row["source_id"]),
            source_name=row["source_name"],
        )
        return MemoryEvidenceExplanation(
            citation=citation,
            excerpt=(row["text"] or "")[
                row["evidence_start"] : row["evidence_end"]
            ],
        )

    @staticmethod
    async def _load_entities(session, workspace_id, ids, mappings, chunks):
        if not ids:
            return ()
        rows = (
            await session.execute(
                text(
                    """SELECT canonical_entity_id, canonical_name
                         FROM current_canonical_entities
                        WHERE workspace_id = :workspace_id
                          AND canonical_entity_id = ANY(:ids)
                        ORDER BY canonical_entity_id"""
                ),
                {"workspace_id": workspace_id, "ids": ids},
            )
        ).mappings().all()
        chunk_scores = {row["chunk_id"]: float(row["semantic_score"]) for row in chunks}
        chunks_by_entity: dict[str, set[str]] = defaultdict(set)
        for mapping in mappings:
            if mapping["target_kind"] == "entity":
                chunks_by_entity[str(mapping["target_id"])].add(mapping["chunk_id"])
        return tuple(
            TGSEntityCandidate(
                entity_id=str(row["canonical_entity_id"]),
                semantic_score=max(
                    (chunk_scores[value] for value in chunks_by_entity[str(row["canonical_entity_id"])]),
                    default=0.0,
                ),
                source_chunk_ids=tuple(
                    sorted(chunks_by_entity[str(row["canonical_entity_id"])])
                ),
            )
            for row in rows
        )

    @staticmethod
    async def _load_relationships(session, workspace_id, ids, mappings, chunks):
        if not ids:
            return ()
        rows = (
            await session.execute(
                text(
                    """SELECT relationship_id, subject_entity_id,
                              object_entity_id, predicate, polarity, assertion_ids
                         FROM current_canonical_relationships
                        WHERE workspace_id = :workspace_id
                          AND relationship_id = ANY(:ids)
                          AND object_entity_id IS NOT NULL
                        ORDER BY relationship_id"""
                ),
                {"workspace_id": workspace_id, "ids": ids},
            )
        ).mappings().all()
        chunk_scores = {row["chunk_id"]: float(row["semantic_score"]) for row in chunks}
        chunks_by_relationship: dict[str, set[str]] = defaultdict(set)
        for mapping in mappings:
            if mapping["target_kind"] == "relationship":
                chunks_by_relationship[str(mapping["target_id"])].add(
                    mapping["chunk_id"]
                )
        return tuple(
            TGSRelationshipCandidate(
                relationship_id=str(row["relationship_id"]),
                source_entity_id=str(row["subject_entity_id"]),
                target_entity_id=str(row["object_entity_id"]),
                predicate=row["predicate"],
                polarity=row["polarity"],
                assertion_ids=tuple(str(value) for value in row["assertion_ids"]),
                source_chunk_ids=tuple(
                    sorted(chunks_by_relationship[str(row["relationship_id"])])
                ),
                semantic_score=max(
                    (
                        chunk_scores[value]
                        for value in chunks_by_relationship[str(row["relationship_id"])]
                    ),
                    default=0.0,
                ),
            )
            for row in rows
            if chunks_by_relationship[str(row["relationship_id"])]
        )

    @staticmethod
    async def _load_citations(session, workspace_id, subject_id, mappings):
        assertion_ids = sorted({row["assertion_id"] for row in mappings}, key=str)
        if not assertion_ids:
            return {}
        rows = (
            await session.execute(
                text(
                    """SELECT assertion.assertion_id, assertion.revision_id,
                              assertion.chunk_id, assertion.evidence_start,
                              assertion.evidence_end, chunk.source_id,
                              chunk.source_name, chunk.document_id
                         FROM assertion_evidence AS assertion
                         JOIN current_chunks AS chunk
                           ON chunk.workspace_id = assertion.workspace_id
                          AND chunk.revision_id = assertion.revision_id
                          AND chunk.chunk_id = assertion.chunk_id
                        WHERE assertion.workspace_id = :workspace_id
                          AND assertion.assertion_id = ANY(:assertion_ids)
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(chunk.acl_principal_ids, :subject_id))
                        ORDER BY assertion.assertion_id"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "assertion_ids": assertion_ids,
                },
            )
        ).mappings().all()
        citations: dict[str, list[MemoryCitation]] = defaultdict(list)
        for row in rows:
            assertion_id = str(row["assertion_id"])
            citations[assertion_id].append(
                MemoryCitation(
                    assertion_id=assertion_id,
                    revision_id=str(row["revision_id"]),
                    chunk_id=row["chunk_id"],
                    resource_uri=(
                        f"flae://workspace/{workspace_id}/documents/"
                        f"{row['document_id']}/revisions/{row['revision_id']}"
                        f"/chunks/{row['chunk_id']}"
                    ),
                    evidence_start=row["evidence_start"],
                    evidence_end=row["evidence_end"],
                    source_id=str(row["source_id"]),
                    source_name=row["source_name"],
                )
            )
        return {key: tuple(value) for key, value in citations.items()}
