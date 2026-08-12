"""Canonical construction boundary for authorized Company Memory queries."""

from __future__ import annotations

from uuid import UUID

from app.db.rag_db import rag_db_manager
from app.db.rag_repository import AuthorizationContext
from app.services.knowledge.retrieval.query_repository import (
    CanonicalQueryRepository,
)
from app.services.knowledge.retrieval.query_service import KnowledgeQueryService
from app.services.knowledge.retrieval.retriever import RetrieverService


def create_memory_query_service(
    workspace_id: UUID, subject_id: str
) -> KnowledgeQueryService:
    authorization = AuthorizationContext(
        workspace_id=workspace_id,
        subject_id=subject_id,
        authorization_version="firebase-uid-v1",
    )
    return KnowledgeQueryService(
        CanonicalQueryRepository(
            rag_db_manager,
            authorization,
            RetrieverService.get_embedding,
        )
    )
