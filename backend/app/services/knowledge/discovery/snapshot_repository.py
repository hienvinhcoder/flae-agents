"""Transactional persistence for immutable discovery snapshots."""

from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.discovery_catalog import (
    DiscoveryProjectionBundle,
    DiscoverySnapshot,
    DiscoverySnapshotBasis,
)


class DiscoverySnapshotRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_current_basis(
        self, workspace_id: UUID
    ) -> DiscoverySnapshotBasis:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                row = await self._basis(session, workspace_id)
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc current graph basis cho discovery."
            ) from error
        if row is None:
            raise InvalidArgumentError(
                "Discovery publish requires a current graph snapshot."
            )
        return DiscoverySnapshotBasis.model_validate(row)

    async def publish_atomic(
        self,
        bundle: DiscoveryProjectionBundle,
        snapshot: DiscoverySnapshot,
    ) -> DiscoverySnapshot:
        try:
            async with self._manager.get_ingestion_session(
                str(snapshot.workspace_id)
            ) as session:
                try:
                    await session.execute(
                        text(
                            "SELECT pg_advisory_xact_lock(hashtextextended(:key, 41723))"
                        ),
                        {"key": str(snapshot.workspace_id)},
                    )
                    expected = DiscoverySnapshotBasis(
                        graph_snapshot_id=snapshot.graph_snapshot_id,
                        revision_set_checksum=snapshot.revision_set_checksum,
                    )
                    current = await self._basis(session, snapshot.workspace_id)
                    if current is None or DiscoverySnapshotBasis.model_validate(
                        current
                    ) != expected:
                        raise InvalidArgumentError(
                            "Discovery graph basis changed before staging."
                        )
                    existing = (
                        await session.execute(
                            text(
                                """SELECT status, discovery_checksum
                                     FROM discovery_snapshots
                                    WHERE workspace_id = :workspace_id
                                      AND snapshot_id = :snapshot_id"""
                            ),
                            {
                                "workspace_id": str(snapshot.workspace_id),
                                "snapshot_id": snapshot.snapshot_id,
                            },
                        )
                    ).mappings().one_or_none()
                    if existing is not None:
                        if (
                            existing["status"] != "current"
                            or existing["discovery_checksum"]
                            != snapshot.discovery_checksum
                        ):
                            raise InvalidArgumentError(
                                "Historical discovery snapshot cannot become current again."
                            )
                        return snapshot
                    await self._stage(session, bundle, snapshot)
                    rechecked = await self._basis(session, snapshot.workspace_id)
                    if rechecked is None or DiscoverySnapshotBasis.model_validate(
                        rechecked
                    ) != expected:
                        raise InvalidArgumentError(
                            "Discovery graph basis changed before current switch."
                        )
                    await session.execute(
                        text(
                            """UPDATE discovery_snapshots SET status = 'historical'
                                WHERE workspace_id = :workspace_id
                                  AND status = 'current'"""
                        ),
                        {"workspace_id": str(snapshot.workspace_id)},
                    )
                    await session.execute(
                        text(
                            """UPDATE discovery_snapshots
                                  SET status = 'current', published_at = now()
                                WHERE workspace_id = :workspace_id
                                  AND snapshot_id = :snapshot_id
                                  AND status = 'staging'"""
                        ),
                        {
                            "workspace_id": str(snapshot.workspace_id),
                            "snapshot_id": snapshot.snapshot_id,
                        },
                    )
                    await session.execute(
                        text(
                            """UPDATE document_revisions
                                  SET discovery_readiness = 'ready',
                                      readiness_reason = NULL, updated_at = now()
                                WHERE workspace_id = :workspace_id
                                  AND state = 'searchable'
                                  AND base_readiness = 'ready'
                                  AND graph_readiness = 'ready'"""
                        ),
                        {"workspace_id": str(snapshot.workspace_id)},
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể publish discovery snapshot."
            ) from error
        return snapshot

    @staticmethod
    async def _basis(session, workspace_id):
        return (
            await session.execute(
                text(
                    """SELECT graph_snapshot_id, revision_set_checksum
                         FROM current_graph_snapshots
                        WHERE workspace_id = :workspace_id"""
                ),
                {"workspace_id": str(workspace_id)},
            )
        ).mappings().one_or_none()

    @staticmethod
    async def _stage(session, bundle, snapshot) -> None:
        await session.execute(
            text(
                """INSERT INTO discovery_snapshots (
                     workspace_id, snapshot_id, graph_snapshot_id,
                     topic_discovery_run_id, context_discovery_run_id,
                     revision_set_checksum, discovery_checksum, status,
                     topic_count, context_count
                   ) VALUES (
                     :workspace_id, :snapshot_id, :graph_snapshot_id,
                     :topic_run_id, :context_run_id, :revision_checksum,
                     :discovery_checksum, 'staging', :topic_count, :context_count)"""
            ),
            {
                "workspace_id": str(snapshot.workspace_id),
                "snapshot_id": snapshot.snapshot_id,
                "graph_snapshot_id": snapshot.graph_snapshot_id,
                "topic_run_id": snapshot.topic_discovery_run_id,
                "context_run_id": snapshot.context_discovery_run_id,
                "revision_checksum": snapshot.revision_set_checksum,
                "discovery_checksum": snapshot.discovery_checksum,
                "topic_count": snapshot.topic_count,
                "context_count": snapshot.context_count,
            },
        )
        await session.execute(
            text(
                """INSERT INTO discovery_snapshot_payloads (
                     workspace_id, snapshot_id, topic_payload, context_payload
                   ) VALUES (
                     :workspace_id, :snapshot_id,
                     CAST(:topic_payload AS jsonb), CAST(:context_payload AS jsonb))"""
            ),
            {
                "workspace_id": str(snapshot.workspace_id),
                "snapshot_id": snapshot.snapshot_id,
                "topic_payload": json.dumps(
                    bundle.topics.model_dump(mode="json")
                ),
                "context_payload": json.dumps(
                    bundle.contexts.model_dump(mode="json")
                ),
            },
        )
