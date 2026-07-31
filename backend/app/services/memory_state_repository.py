"""Persistence boundary for versioned memory-state projections."""

from __future__ import annotations

import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.agent_memory import EvidenceCitation, EvidenceProvenance
from app.schemas.memory_state import (
    ExpectedEvidenceRule,
    MemoryStateAssertion,
    MemoryStateProjection,
    MemoryStateProjectionInput,
)


class MemoryStateRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_projection_input(
        self,
        workspace_id: UUID,
        *,
        projection_version: str,
        inspected_at: datetime,
    ) -> MemoryStateProjectionInput:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                basis = await self._load_basis(session, workspace_id)
                if basis is None:
                    raise InvalidArgumentError(
                        "Memory-state projection requires a current graph snapshot."
                    )
                assertion_rows = (
                    await session.execute(
                        text(self._ASSERTION_QUERY),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                rule_rows = (
                    await session.execute(
                        text(
                            """SELECT rule_id, description, subject_entity_id,
                                      predicate, required_polarities,
                                      minimum_confidence, stale_after_seconds
                                 FROM memory_state_rules
                                WHERE workspace_id = :workspace_id AND enabled
                                ORDER BY rule_id"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc evidence cho memory-state projection."
            ) from error
        return MemoryStateProjectionInput(
            workspace_id=workspace_id,
            graph_snapshot_id=basis["graph_snapshot_id"],
            revision_set_checksum=basis["revision_set_checksum"],
            projection_version=projection_version,
            inspected_at=inspected_at,
            assertions=tuple(self._assertion(row) for row in assertion_rows),
            expected_evidence_rules=tuple(
                ExpectedEvidenceRule.model_validate(row) for row in rule_rows
            ),
        )

    async def publish_atomic(
        self, projection: MemoryStateProjection
    ) -> MemoryStateProjection:
        workspace_id = projection.workspace_id
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                try:
                    await session.execute(
                        text(
                            "SELECT pg_advisory_xact_lock("
                            "hashtextextended(:key, 91837))"
                        ),
                        {"key": str(workspace_id)},
                    )
                    await self._validate_basis(session, projection)
                    existing = (
                        await session.execute(
                            text(
                                """SELECT status, projection_checksum
                                     FROM memory_state_projections
                                    WHERE workspace_id = :workspace_id
                                      AND projection_id = :projection_id"""
                            ),
                            {
                                "workspace_id": str(workspace_id),
                                "projection_id": projection.projection_id,
                            },
                        )
                    ).mappings().one_or_none()
                    if existing is not None:
                        if (
                            existing["status"] != "current"
                            or existing["projection_checksum"]
                            != projection.projection_checksum
                        ):
                            raise InvalidArgumentError(
                                "Historical memory-state projection cannot be republished."
                            )
                        return projection
                    await self._stage(session, projection)
                    await self._validate_basis(session, projection)
                    await session.execute(
                        text(
                            """UPDATE memory_state_projections
                                  SET status = 'historical'
                                WHERE workspace_id = :workspace_id
                                  AND status = 'current'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                    await session.execute(
                        text(
                            """UPDATE memory_state_projections
                                  SET status = 'current', published_at = now()
                                WHERE workspace_id = :workspace_id
                                  AND projection_id = :projection_id
                                  AND status = 'staging'"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "projection_id": projection.projection_id,
                        },
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể publish memory-state projection."
            ) from error
        return projection

    @staticmethod
    async def _load_basis(session, workspace_id):
        return (
            await session.execute(
                text(
                    """SELECT snapshot_id AS graph_snapshot_id,
                              revision_set_checksum
                         FROM current_graph_snapshots
                        WHERE workspace_id = :workspace_id"""
                ),
                {"workspace_id": str(workspace_id)},
            )
        ).mappings().one_or_none()

    async def _validate_basis(self, session, projection) -> None:
        basis = await self._load_basis(session, projection.workspace_id)
        if (
            basis is None
            or basis["graph_snapshot_id"] != projection.graph_snapshot_id
            or basis["revision_set_checksum"] != projection.revision_set_checksum
        ):
            raise InvalidArgumentError(
                "Memory-state projection is stale for the current graph basis."
            )

    @staticmethod
    async def _stage(session, projection) -> None:
        await session.execute(
            text(
                """INSERT INTO memory_state_projections (
                     workspace_id, projection_id, graph_snapshot_id,
                     revision_set_checksum, projection_version,
                     projection_checksum, status, inspected_at,
                     change_count, contradiction_count, gap_count, payload
                   ) VALUES (
                     :workspace_id, :projection_id, :graph_snapshot_id,
                     :revision_set_checksum, :projection_version,
                     :projection_checksum, 'staging', :inspected_at,
                     :change_count, :contradiction_count, :gap_count,
                     CAST(:payload AS jsonb))"""
            ),
            {
                "workspace_id": str(projection.workspace_id),
                "projection_id": projection.projection_id,
                "graph_snapshot_id": projection.graph_snapshot_id,
                "revision_set_checksum": projection.revision_set_checksum,
                "projection_version": projection.projection_version,
                "projection_checksum": projection.projection_checksum,
                "inspected_at": projection.inspected_at,
                "change_count": len(projection.changes),
                "contradiction_count": len(projection.contradictions),
                "gap_count": len(projection.gaps),
                "payload": json.dumps(projection.model_dump(mode="json")),
            },
        )

    @staticmethod
    def _assertion(row) -> MemoryStateAssertion:
        location = {**row["location_data"], "kind": row["location_kind"]}
        provenance = EvidenceProvenance(
            workspace_id=row["workspace_id"],
            source_id=row["source_id"],
            document_id=row["document_id"],
            revision_id=row["revision_id"],
            chunk_id=row["chunk_id"],
            source_name=row["source_name"],
            source_type=row["source_type"],
            location=location,
            source_modified_at=row["source_modified_at"],
            ingested_at=row["ingested_at"],
            content_hash=row["content_hash"],
        )
        citation = EvidenceCitation(
            assertion_id=row["assertion_id"],
            provenance=provenance,
            evidence_start=row["evidence_start"],
            evidence_end=row["evidence_end"],
        )
        return MemoryStateAssertion(
            assertion_id=row["assertion_id"],
            subject_entity_id=row["subject_entity_id"],
            predicate=row["predicate"],
            object_entity_id=row["object_entity_id"],
            object_value=row["object_value"],
            polarity=row["polarity"],
            confidence=row["confidence"],
            valid_from=row["valid_from"],
            valid_to=row["valid_to"],
            revision_id=row["revision_id"],
            revision_order=row["revision_order"],
            is_current=row["is_current"],
            citation=citation,
        )

    _ASSERTION_QUERY = """
        WITH ranked_revisions AS (
          SELECT revision.*,
                 dense_rank() OVER (
                   PARTITION BY revision.document_id
                   ORDER BY revision.created_at, revision.revision_id
                 ) - 1 AS revision_order
            FROM document_revisions AS revision
           WHERE revision.workspace_id = :workspace_id
             AND revision.state IN ('searchable', 'superseded')
             AND revision.base_readiness = 'ready'
        ), latest_assignments AS (
          SELECT DISTINCT ON (assignment.observation_id)
                 assignment.observation_id, assignment.canonical_entity_id
            FROM entity_resolution_assignments AS assignment
            JOIN entity_resolution_runs AS run
              ON run.workspace_id = assignment.workspace_id
             AND run.resolution_run_id = assignment.resolution_run_id
           WHERE assignment.workspace_id = :workspace_id
             AND assignment.canonical_entity_id IS NOT NULL
             AND run.status = 'complete'
           ORDER BY assignment.observation_id, run.created_at DESC,
                    run.resolution_run_id DESC
        )
        SELECT assertion.assertion_id, assertion.revision_id,
               assertion.chunk_id, subject.canonical_entity_id AS subject_entity_id,
               assertion.predicate,
               object_assignment.canonical_entity_id AS object_entity_id,
               assertion.object_value, assertion.polarity, assertion.confidence,
               assertion.valid_from, assertion.valid_to,
               revision.revision_order,
               revision.state = 'searchable' AS is_current,
               assertion.evidence_start, assertion.evidence_end,
               chunk.workspace_id, chunk.source_id, chunk.document_id,
               chunk.source_name, chunk.source_type, chunk.location_kind,
               chunk.location_data, chunk.source_modified_at, chunk.ingested_at,
               chunk.content_hash
          FROM assertion_evidence AS assertion
          JOIN ranked_revisions AS revision
            ON revision.workspace_id = assertion.workspace_id
           AND revision.revision_id = assertion.revision_id
          JOIN chunks AS chunk
            ON chunk.workspace_id = assertion.workspace_id
           AND chunk.revision_id = assertion.revision_id
           AND chunk.chunk_id = assertion.chunk_id
          JOIN latest_assignments AS subject
            ON subject.observation_id = assertion.subject_observation_id
          LEFT JOIN latest_assignments AS object_assignment
            ON object_assignment.observation_id = assertion.object_observation_id
         WHERE assertion.workspace_id = :workspace_id
           AND (assertion.object_observation_id IS NULL
                OR object_assignment.canonical_entity_id IS NOT NULL)
         ORDER BY revision.document_id, revision.revision_order,
                  assertion.assertion_id
    """
