"""ACL-prefiltered chunk content, mapping, and citation loader."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.memory_query import MemoryCitation
from app.services.knowledge.retrieval.query_service import TGSChunkContent
from app.services.knowledge.retrieval.provenance import (
    build_evidence_provenance,
)
from app.services.knowledge.retrieval.models import TGSChunkCandidate


@dataclass(frozen=True)
class LoadedChunks:
    candidates: tuple[TGSChunkCandidate, ...]
    content: dict[str, TGSChunkContent]


class CanonicalChunkLoader:
    @staticmethod
    async def load_by_ids(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        embedding: str,
        chunk_ids: tuple[str, ...],
    ) -> LoadedChunks:
        if not chunk_ids:
            return LoadedChunks(candidates=(), content={})
        rows = (
            await session.execute(
                text(
                    """SELECT chunk.chunk_id, chunk.source_id,
                              chunk.document_id, chunk.revision_id,
                              chunk.source_name, chunk.source_type,
                              chunk.source_modified_at, chunk.ingested_at,
                              chunk.location_kind, chunk.location_data,
                              chunk.content_hash, chunk.text, chunk.token_count,
                              1 - (chunk.embedding <=> CAST(:embedding AS vector))
                                AS semantic_score
                         FROM current_chunks AS chunk
                        WHERE chunk.workspace_id = :workspace_id
                          AND chunk.chunk_id = ANY(:chunk_ids)
                          AND chunk.embedding IS NOT NULL
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(chunk.acl_principal_ids, :subject_id))
                        ORDER BY chunk.chunk_id"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "embedding": embedding,
                    "chunk_ids": list(chunk_ids),
                },
            )
        ).mappings().all()
        return await CanonicalChunkLoader.materialize(
            session, workspace_id, subject_id, rows
        )

    @staticmethod
    async def materialize(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        rows,
    ) -> LoadedChunks:
        chunk_ids = [row["chunk_id"] for row in rows]
        entities_by_chunk: dict[str, set[str]] = defaultdict(set)
        if chunk_ids:
            mappings = (
                await session.execute(
                    text(
                        """SELECT mapping.chunk_id, mapping.target_id
                             FROM current_semantic_graph_mappings AS mapping
                             JOIN current_chunks AS chunk
                               ON chunk.workspace_id = mapping.workspace_id
                              AND chunk.revision_id = mapping.revision_id
                              AND chunk.chunk_id = mapping.chunk_id
                            WHERE mapping.workspace_id = :workspace_id
                              AND mapping.target_kind = 'entity'
                              AND mapping.chunk_id = ANY(:chunk_ids)
                              AND (chunk.acl_scope = 'workspace'
                                   OR jsonb_exists(
                                        chunk.acl_principal_ids, :subject_id))"""
                    ),
                    {
                        "workspace_id": workspace_id,
                        "subject_id": subject_id,
                        "chunk_ids": chunk_ids,
                    },
                )
            ).mappings().all()
            for mapping in mappings:
                entities_by_chunk[mapping["chunk_id"]].add(
                    str(mapping["target_id"])
                )
        return LoadedChunks(
            candidates=tuple(
                TGSChunkCandidate(
                    chunk_id=row["chunk_id"],
                    source_id=str(row["source_id"]),
                    semantic_score=float(row["semantic_score"]),
                    entity_ids=tuple(sorted(entities_by_chunk[row["chunk_id"]])),
                    token_count=int(row["token_count"] or 0),
                )
                for row in rows
            ),
            content={
                row["chunk_id"]: TGSChunkContent(
                    source_name=row["source_name"],
                    resource_uri=(
                        f"flae://workspace/{workspace_id}/documents/"
                        f"{row['document_id']}/revisions/{row['revision_id']}"
                        f"/chunks/{row['chunk_id']}"
                    ),
                    content=row["text"] or "",
                    provenance=build_evidence_provenance(workspace_id, row),
                )
                for row in rows
            },
        )

    @staticmethod
    async def load_citations(
        session: AsyncSession,
        workspace_id: str,
        subject_id: str,
        assertion_ids: tuple[str, ...],
    ) -> dict[str, tuple[MemoryCitation, ...]]:
        if not assertion_ids:
            return {}
        rows = (
            await session.execute(
                text(
                    """SELECT assertion.assertion_id, assertion.revision_id,
                              assertion.chunk_id, assertion.evidence_start,
                              assertion.evidence_end, chunk.source_id,
                              chunk.source_name, chunk.source_type,
                              chunk.source_modified_at, chunk.ingested_at,
                              chunk.location_kind, chunk.location_data,
                              chunk.content_hash, chunk.document_id
                         FROM assertion_evidence AS assertion
                         JOIN current_chunks AS chunk
                           ON chunk.workspace_id = assertion.workspace_id
                          AND chunk.revision_id = assertion.revision_id
                          AND chunk.chunk_id = assertion.chunk_id
                        WHERE assertion.workspace_id = :workspace_id
                          AND assertion.assertion_id::text = ANY(:assertion_ids)
                          AND (chunk.acl_scope = 'workspace'
                               OR jsonb_exists(chunk.acl_principal_ids, :subject_id))
                        ORDER BY assertion.assertion_id"""
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "assertion_ids": list(assertion_ids),
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
                    provenance=build_evidence_provenance(workspace_id, row),
                )
            )
        return {key: tuple(value) for key, value in citations.items()}
