"""Atomic publication and failure handling for current C-G-M snapshots."""

from __future__ import annotations

from hashlib import sha256
import json
from typing import cast
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.graph_enrichment import GraphSnapshotPublishResult
from app.services.knowalge_base.graph_projection_repository import (
    revision_set_checksum,
)
from app.services.knowalge_base.graph_snapshot_semantic_validator import (
    SemanticGraphValidation,
    load_current_revisions,
    load_graph_projection,
    validate_complete_semantic_projection,
    validate_relationship_projection,
)


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value, default=str, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


class GraphSnapshotService:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def publish(
        self, workspace_id: UUID, *, projection_id: UUID | None = None
    ) -> GraphSnapshotPublishResult:
        """Legacy graph publication retained for existing workflow replay."""
        return await self._publish(
            workspace_id,
            projection_id=projection_id,
            semantic_projection_id=None,
        )

    async def publish_complete(
        self,
        workspace_id: UUID,
        *,
        projection_id: UUID,
        semantic_projection_id: UUID,
    ) -> GraphSnapshotPublishResult:
        """Publish only a complete semantic C-G-M projection."""
        return await self._publish(
            workspace_id,
            projection_id=projection_id,
            semantic_projection_id=semantic_projection_id,
        )

    async def _publish(
        self,
        workspace_id: UUID,
        *,
        projection_id: UUID | None,
        semantic_projection_id: UUID | None,
    ) -> GraphSnapshotPublishResult:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                try:
                    await self._lock_workspace(session, workspace_id)
                    projection = await load_graph_projection(
                        session, workspace_id, projection_id
                    )
                    revisions = await load_current_revisions(
                        session, workspace_id, lock=True
                    )
                    current_revision_checksum = revision_set_checksum(revisions)
                    if projection["revision_set_checksum"] != current_revision_checksum:
                        raise InvalidArgumentError(
                            "Graph projection is stale for the current revision set."
                        )
                    relationship_count, mapping_count = (
                        await validate_relationship_projection(
                            session,
                            workspace_id,
                            cast(UUID, projection["projection_id"]),
                        )
                    )
                    semantic = await self._validate_semantics(
                        session,
                        workspace_id,
                        projection,
                        semantic_projection_id,
                    )
                    entity_count = semantic.entity_count if semantic else 0
                    if semantic is not None:
                        relationship_count = semantic.relationship_count
                        mapping_count = semantic.mapping_count
                    graph_checksum = _checksum(
                        {
                            "revision_set_checksum": current_revision_checksum,
                            "resolution_mapping_checksum": projection[
                                "mapping_checksum"
                            ],
                            "projection_checksum": projection["projection_checksum"],
                            "semantic_projection_checksum": (
                                semantic.projection_checksum if semantic else None
                            ),
                            "relationship_count": relationship_count,
                            "mapping_count": mapping_count,
                        }
                    )
                    snapshot_id = uuid5(
                        NAMESPACE_URL,
                        f"flae:graph-snapshot:{workspace_id}:"
                        f"{projection['projection_id']}:{semantic_projection_id}:"
                        f"{graph_checksum}",
                    )
                    existing = (
                        await session.execute(
                            text(
                                """SELECT status FROM graph_snapshots
                                    WHERE workspace_id = :workspace_id
                                      AND snapshot_id = :snapshot_id"""
                            ),
                            {
                                "workspace_id": str(workspace_id),
                                "snapshot_id": snapshot_id,
                            },
                        )
                    ).mappings().one_or_none()
                    if existing is not None:
                        if existing["status"] != "current":
                            raise InvalidArgumentError(
                                "A historical graph snapshot cannot become current again."
                            )
                        await session.commit()
                        return self._result(
                            snapshot_id,
                            projection["projection_id"],
                            semantic_projection_id,
                            len(revisions),
                            entity_count,
                            relationship_count,
                            mapping_count,
                            graph_checksum,
                        )
                    await self._stage_snapshot(
                        session,
                        workspace_id,
                        snapshot_id,
                        projection,
                        revisions,
                        current_revision_checksum,
                        graph_checksum,
                        semantic_projection_id,
                    )
                    self._after_write_boundary("snapshot_staged")
                    rechecked = await load_current_revisions(
                        session, workspace_id, lock=False
                    )
                    if revision_set_checksum(rechecked) != current_revision_checksum:
                        raise InvalidArgumentError(
                            "Current revision set changed during graph publish."
                        )
                    await session.execute(
                        text(
                            """UPDATE graph_snapshots SET status = 'historical'
                                WHERE workspace_id = :workspace_id
                                  AND status = 'current'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                    await session.execute(
                        text(
                            """UPDATE graph_snapshots
                                  SET status = 'current', published_at = now()
                                WHERE workspace_id = :workspace_id
                                  AND snapshot_id = :snapshot_id
                                  AND status = 'staging'"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "snapshot_id": snapshot_id,
                        },
                    )
                    await session.execute(
                        text(
                            """UPDATE document_revisions
                                  SET graph_readiness = 'ready',
                                      readiness_reason = NULL, updated_at = now()
                                WHERE workspace_id = :workspace_id
                                  AND state = 'searchable'
                                  AND base_readiness = 'ready'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                    self._after_write_boundary("snapshot_switched")
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể publish graph snapshot.") from error
        return self._result(
            snapshot_id,
            projection["projection_id"],
            semantic_projection_id,
            len(revisions),
            entity_count,
            relationship_count,
            mapping_count,
            graph_checksum,
        )

    @staticmethod
    async def _validate_semantics(
        session: AsyncSession,
        workspace_id: UUID,
        projection: dict[str, object],
        semantic_projection_id: UUID | None,
    ) -> SemanticGraphValidation | None:
        if semantic_projection_id is None:
            return None
        return await validate_complete_semantic_projection(
            session,
            workspace_id,
            resolution_run_id=cast(UUID, projection["resolution_run_id"]),
            relationship_projection_id=cast(UUID, projection["projection_id"]),
            semantic_projection_id=semantic_projection_id,
        )

    async def mark_failed(self, workspace_id: UUID, *, reason: str) -> None:
        if not reason.strip() or len(reason) > 500:
            raise InvalidArgumentError("Graph failure reason must be 1-500 characters.")
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                await self._lock_workspace(session, workspace_id)
                await session.execute(
                    text(
                        """UPDATE document_revisions
                              SET graph_readiness = 'failed',
                                  readiness_reason = :reason, updated_at = now()
                            WHERE workspace_id = :workspace_id
                              AND state = 'searchable'
                              AND base_readiness = 'ready'"""
                    ),
                    {"workspace_id": str(workspace_id), "reason": reason},
                )
                await session.commit()
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể cập nhật graph readiness.") from error

    @staticmethod
    async def _lock_workspace(session: AsyncSession, workspace_id: UUID) -> None:
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 41721))"),
            {"key": str(workspace_id)},
        )

    @staticmethod
    async def _stage_snapshot(
        session,
        workspace_id,
        snapshot_id,
        projection,
        revisions,
        revision_checksum,
        graph_checksum,
        semantic_projection_id,
    ) -> None:
        await session.execute(
            text(
                """INSERT INTO graph_snapshots (
                     workspace_id, snapshot_id, projection_id, resolution_run_id,
                     semantic_projection_id, revision_set_checksum,
                     graph_checksum, status
                   ) VALUES (
                     :workspace_id, :snapshot_id, :projection_id,
                     :resolution_run_id, :semantic_projection_id,
                     :revision_checksum, :graph_checksum, 'staging')"""
            ),
            {
                "workspace_id": str(workspace_id),
                "snapshot_id": snapshot_id,
                "projection_id": projection["projection_id"],
                "resolution_run_id": projection["resolution_run_id"],
                "semantic_projection_id": semantic_projection_id,
                "revision_checksum": revision_checksum,
                "graph_checksum": graph_checksum,
            },
        )
        await session.execute(
            text(
                """INSERT INTO graph_snapshot_revisions (
                     workspace_id, snapshot_id, revision_id,
                     content_checksum, acl_checksum
                   ) VALUES (
                     :workspace_id, :snapshot_id, :revision_id,
                     :content_checksum, :acl_checksum)"""
            ),
            [
                {
                    "workspace_id": str(workspace_id),
                    "snapshot_id": snapshot_id,
                    **revision,
                }
                for revision in revisions
            ],
        )

    @staticmethod
    def _result(
        snapshot_id,
        projection_id,
        semantic_projection_id,
        revision_count,
        entity_count,
        relationship_count,
        mapping_count,
        graph_checksum,
    ) -> GraphSnapshotPublishResult:
        return GraphSnapshotPublishResult(
            snapshot_id=snapshot_id,
            projection_id=projection_id,
            semantic_projection_id=semantic_projection_id,
            revision_count=revision_count,
            entity_count=entity_count,
            relationship_count=relationship_count,
            mapping_count=mapping_count,
            graph_checksum=graph_checksum,
            published=True,
        )

    @staticmethod
    def _after_write_boundary(_boundary: str) -> None:
        """Failure-injection hook for atomic publish tests."""
