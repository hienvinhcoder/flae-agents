"""Persistence and bidirectional reads for versioned graph projections."""

from __future__ import annotations

import json
from hashlib import sha256
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.graph_enrichment import GraphProjection, ProjectionAssertion


def revision_set_checksum(rows: list[dict[str, object]]) -> str:
    encoded = json.dumps(
        rows,
        default=str,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


class GraphProjectionRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_evidence(
        self, workspace_id: UUID
    ) -> tuple[tuple[ProjectionAssertion, ...], str]:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                rows = (
                    await session.execute(
                        text(
                            """SELECT assertion.assertion_id,
                                      assertion.revision_id, assertion.chunk_id,
                                      assertion.subject_observation_id,
                                      assertion.predicate,
                                      assertion.object_observation_id,
                                      assertion.object_value, assertion.polarity,
                                      assertion.confidence
                               FROM assertion_evidence AS assertion
                               JOIN document_revisions AS revision
                                 ON revision.workspace_id = assertion.workspace_id
                                AND revision.revision_id = assertion.revision_id
                              WHERE assertion.workspace_id = :workspace_id
                                AND revision.state = 'searchable'
                                AND revision.base_readiness = 'ready'
                              ORDER BY assertion.assertion_id"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                revisions = (
                    await session.execute(
                        text(
                            """SELECT revision_id, content_checksum, acl_checksum
                                 FROM document_revisions
                                WHERE workspace_id = :workspace_id
                                  AND state = 'searchable'
                                  AND base_readiness = 'ready'
                                ORDER BY revision_id"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc assertion evidence cho graph projection."
            ) from error
        return (
            tuple(ProjectionAssertion.model_validate(row) for row in rows),
            revision_set_checksum([dict(row) for row in revisions]),
        )

    async def persist(
        self, workspace_id: UUID, projection: GraphProjection
    ) -> GraphProjection:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                try:
                    existing = await session.scalar(
                        text(
                            """SELECT projection_checksum
                                 FROM relationship_projection_versions
                                WHERE workspace_id = :workspace_id
                                  AND projection_id = :projection_id"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "projection_id": projection.projection_id,
                        },
                    )
                    if existing is not None:
                        if existing != projection.projection_checksum:
                            raise InvalidArgumentError(
                                "Graph projection replay conflicts with stored checksum."
                            )
                        return projection
                    await session.execute(
                        text(
                            """INSERT INTO relationship_projection_versions (
                                 workspace_id, projection_id, resolution_run_id,
                                 projection_version, evidence_checksum,
                                 revision_set_checksum, projection_checksum, status
                               ) VALUES (
                                 :workspace_id, :projection_id, :resolution_run_id,
                                 :projection_version, :evidence_checksum,
                                 :revision_set_checksum, :projection_checksum,
                                 'complete')"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            **projection.model_dump(
                                mode="json", exclude={"relationships", "mappings"}
                            ),
                        },
                    )
                    await self._write_relationships(session, workspace_id, projection)
                    await self._write_mappings(session, workspace_id, projection)
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể ghi graph projection vào RAG database."
            ) from error
        return projection

    @staticmethod
    async def _write_relationships(session, workspace_id, projection) -> None:
        if projection.relationships:
            await session.execute(
                text(
                    """INSERT INTO canonical_relationship_versions (
                         workspace_id, projection_id, relationship_id,
                         subject_entity_id, predicate, object_entity_id,
                         object_value, polarity, confidence, frequency,
                         assertion_ids, chunk_ids, revision_ids
                       ) VALUES (
                         :workspace_id, :projection_id, :relationship_id,
                         :subject_entity_id, :predicate, :object_entity_id,
                         :object_value, :polarity, :confidence, :frequency,
                         CAST(:assertion_ids AS jsonb), CAST(:chunk_ids AS jsonb),
                         CAST(:revision_ids AS jsonb))"""
                ),
                [
                    {
                        "workspace_id": str(workspace_id),
                        "projection_id": projection.projection_id,
                        **item.model_dump(
                            mode="json",
                            exclude={"assertion_ids", "chunk_ids", "revision_ids"},
                        ),
                        "assertion_ids": json.dumps(
                            [str(value) for value in item.assertion_ids]
                        ),
                        "chunk_ids": json.dumps(item.chunk_ids),
                        "revision_ids": json.dumps(
                            [str(value) for value in item.revision_ids]
                        ),
                    }
                    for item in projection.relationships
                ],
            )

    @staticmethod
    async def _write_mappings(session, workspace_id, projection) -> None:
        if projection.mappings:
            await session.execute(
                text(
                    """INSERT INTO graph_mappings (
                         workspace_id, projection_id, mapping_id, revision_id,
                         chunk_id, assertion_id, target_kind, target_id
                       ) VALUES (
                         :workspace_id, :projection_id, :mapping_id, :revision_id,
                         :chunk_id, :assertion_id, :target_kind, :target_id)"""
                ),
                [
                    {
                        "workspace_id": str(workspace_id),
                        "projection_id": projection.projection_id,
                        **item.model_dump(mode="json"),
                    }
                    for item in projection.mappings
                ],
            )
