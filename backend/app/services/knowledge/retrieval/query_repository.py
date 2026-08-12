"""RLS- and source-ACL-scoped candidate loader for canonical TGS snapshots."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
import numpy as np
from sqlalchemy import text

from app.core.config import settings
from app.db.rag_db import DBManager
from app.db.rag_repository import AuthorizationContext
from app.schemas.memory_query import MemoryCitation, MemoryEvidenceExplanation
from app.core.exceptions import ResourceNotFoundError
from app.services.knowledge.retrieval.query_service import (
    TGSQueryData,
)
from app.services.knowledge.graph.canonical_loader import (
    CanonicalSemanticGraphLoader,
)
from app.services.knowledge.retrieval.provenance import (
    build_evidence_provenance,
)
from app.services.knowledge.retrieval.models import TGSRetrievalConfig


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
        embedding_value = str(embedding.tolist())
        workspace_id = str(self._authorization.workspace_id)
        subject_id = self._authorization.subject_id
        async with self._manager.get_async_session(
            workspace_id, subject_id
        ) as session:
            readiness, semantic_projection_id = (
                await CanonicalSemanticGraphLoader.load_readiness(
                    session, workspace_id
                )
            )
            chunks = await CanonicalSemanticGraphLoader.load_initial_chunks(
                session,
                workspace_id,
                subject_id,
                embedding_value,
                candidate_limit,
            )
            graph_data = None
            if semantic_projection_id is not None:
                graph_data = await CanonicalSemanticGraphLoader.load_graph(
                    session,
                    workspace_id,
                    subject_id,
                    embedding_value,
                    semantic_projection_id,
                    TGSRetrievalConfig(
                        beam_depth=settings.RAG_RETRIEVAL_BFS_DEPTH,
                        beam_width=settings.RAG_RETRIEVAL_BEAM_WIDTH,
                        max_neighbors=settings.RAG_RETRIEVAL_MAX_NEIGHBORS,
                    ),
                )
        graph_chunk_ids = (
            {item.chunk_id for item in graph_data.chunks}
            if graph_data is not None
            else set()
        )
        initial_ids = {item.chunk_id for item in chunks.candidates}
        graph_chunks = (
            tuple(
                item
                for item in graph_data.chunks
                if item.chunk_id in graph_chunk_ids - initial_ids
            )
            if graph_data is not None
            else ()
        )
        return TGSQueryData(
            readiness=readiness,
            chunks=chunks.candidates,
            graph_chunks=graph_chunks,
            chunk_content={
                **chunks.content,
                **(graph_data.content if graph_data is not None else {}),
            },
            graph=graph_data.graph if graph_data is not None else None,
            seed_entity_ids=(
                graph_data.seed_entity_ids[: settings.RAG_RETRIEVAL_TOP_P]
                if graph_data is not None
                else ()
            ),
            citations=graph_data.citations if graph_data is not None else {},
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
                                  chunk.source_name, chunk.source_type,
                                  chunk.source_modified_at, chunk.ingested_at,
                                  chunk.location_kind, chunk.location_data,
                                  chunk.content_hash, chunk.document_id, chunk.text
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
            provenance=build_evidence_provenance(workspace_id, row),
        )
        return MemoryEvidenceExplanation(
            citation=citation,
            excerpt=(row["text"] or "")[
                row["evidence_start"] : row["evidence_end"]
            ],
        )
