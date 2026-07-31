"""ACL-scoped repository for canonical RAG database reads."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from app.db.rag_db import DBManager
from app.core.exceptions import ResourceNotFoundError


class RepositoryBoundaryModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class AuthorizationContext(RepositoryBoundaryModel):
    workspace_id: UUID
    subject_id: str = Field(min_length=1, max_length=500)
    authorization_version: str = Field(min_length=1, max_length=200)


class CandidateBudget(RepositoryBoundaryModel):
    limit: int = Field(default=50, ge=1, le=100)


class AuthorizedChunk(RepositoryBoundaryModel):
    chunk_id: str
    revision_id: UUID
    document_id: UUID
    text: str | None
    source_name: str
    source_type: str
    location_kind: str
    location_data: dict[str, str | int | list[str]]
    content_hash: str


class RagRepository:
    """Every operation is bound to one validated authorization context."""

    def __init__(
        self, manager: DBManager, authorization: AuthorizationContext
    ) -> None:
        self._manager = manager
        self._authorization = authorization

    async def list_current_chunks(
        self, budget: CandidateBudget
    ) -> tuple[AuthorizedChunk, ...]:
        workspace_id = str(self._authorization.workspace_id)
        subject_id = self._authorization.subject_id
        async with self._manager.get_async_session(
            workspace_id, subject_id
        ) as session:
            result = await session.execute(
                text(
                    """
                    SELECT
                      chunk_id, revision_id, document_id, text, source_name,
                      source_type, location_kind, location_data, content_hash
                    FROM public.current_chunks
                    WHERE workspace_id = :workspace_id
                      AND (
                        acl_scope = 'workspace'
                        OR jsonb_exists(acl_principal_ids, :subject_id)
                      )
                    ORDER BY chunk_id
                    LIMIT :limit
                    """
                ),
                {
                    "workspace_id": workspace_id,
                    "subject_id": subject_id,
                    "limit": budget.limit,
                },
            )
            return tuple(
                AuthorizedChunk.model_validate(row)
                for row in result.mappings().all()
            )

    async def get_current_chunk(
        self,
        *,
        workspace_id: UUID,
        document_id: UUID,
        revision_id: UUID,
        chunk_id: str,
    ) -> AuthorizedChunk:
        """Resolve one current chunk through tenant and source ACL boundaries."""
        if workspace_id != self._authorization.workspace_id:
            raise ResourceNotFoundError("Memory resource was not found.")
        subject_id = self._authorization.subject_id
        async with self._manager.get_async_session(
            str(workspace_id), subject_id
        ) as session:
            row = (
                await session.execute(
                    text(
                        """
                        SELECT
                          chunk_id, revision_id, document_id, text, source_name,
                          source_type, location_kind, location_data, content_hash
                        FROM public.current_chunks
                        WHERE workspace_id = :workspace_id
                          AND document_id = :document_id
                          AND revision_id = :revision_id
                          AND chunk_id = :chunk_id
                          AND (
                            acl_scope = 'workspace'
                            OR jsonb_exists(acl_principal_ids, :subject_id)
                          )
                        """
                    ),
                    {
                        "workspace_id": str(workspace_id),
                        "document_id": document_id,
                        "revision_id": revision_id,
                        "chunk_id": chunk_id,
                        "subject_id": subject_id,
                    },
                )
            ).mappings().one_or_none()
            if row is None:
                raise ResourceNotFoundError("Memory resource was not found.")
            return AuthorizedChunk.model_validate(row)
