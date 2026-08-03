"""Persistence boundary for immutable entity-resolution versions."""

from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.graph_enrichment import (
    CanonicalEntityVersion,
    EntityResolutionProjection,
    ResolutionAssignment,
    ResolutionLineage,
    ResolutionObservation,
)


class EntityResolutionRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_inputs(
        self, workspace_id: UUID
    ) -> tuple[tuple[ResolutionObservation, ...], EntityResolutionProjection | None]:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                observation_rows = (
                    await session.execute(
                        text(
                            """SELECT observation.observation_id,
                                      observation.revision_id, observation.chunk_id,
                                      observation.raw_mention,
                                      observation.normalized_mention,
                                      observation.proposed_type, observation.confidence,
                                      observation.external_ids,
                                      observation.disambiguation_attributes
                               FROM entity_observations AS observation
                               JOIN document_revisions AS revision
                                 ON revision.workspace_id = observation.workspace_id
                                AND revision.revision_id = observation.revision_id
                              WHERE observation.workspace_id = :workspace_id
                                AND revision.state = 'searchable'
                                AND revision.base_readiness = 'ready'
                              ORDER BY observation.observation_id"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                assertion_rows = (
                    await session.execute(
                        text(
                            """SELECT assertion.subject_observation_id,
                                      assertion.object_observation_id
                                 FROM assertion_evidence AS assertion
                                 JOIN document_revisions AS revision
                                   ON revision.workspace_id = assertion.workspace_id
                                  AND revision.revision_id = assertion.revision_id
                                WHERE assertion.workspace_id = :workspace_id
                                  AND assertion.object_observation_id IS NOT NULL
                                  AND revision.state = 'searchable'
                                  AND revision.base_readiness = 'ready'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                previous = await self._load_previous(session, workspace_id)
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc entity-resolution evidence từ RAG database."
            ) from error
        mentions = {
            row["observation_id"]: str(row["normalized_mention"])
            for row in observation_rows
        }
        neighbors: dict[UUID, set[str]] = {
            observation_id: set() for observation_id in mentions
        }
        for row in assertion_rows:
            subject_id = row["subject_observation_id"]
            object_id = row["object_observation_id"]
            if subject_id in mentions and object_id in mentions:
                neighbors[subject_id].add(mentions[object_id])
                neighbors[object_id].add(mentions[subject_id])
        return (
            tuple(
                ResolutionObservation.model_validate(
                    {
                        **dict(row),
                        "graph_neighbor_mentions": tuple(
                            sorted(neighbors[row["observation_id"]])
                        ),
                    }
                )
                for row in observation_rows
            ),
            previous,
        )

    async def persist(
        self, workspace_id: UUID, projection: EntityResolutionProjection
    ) -> EntityResolutionProjection:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                try:
                    existing = await session.scalar(
                        text(
                            """SELECT mapping_checksum FROM entity_resolution_runs
                                WHERE workspace_id = :workspace_id
                                  AND resolution_run_id = :run_id"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "run_id": projection.resolution_run_id,
                        },
                    )
                    if existing is not None:
                        if existing != projection.mapping_checksum:
                            raise InvalidArgumentError(
                                "Resolution replay conflicts with its stored checksum."
                            )
                        return projection
                    predecessor = next(
                        (
                            item.predecessor_run_id
                            for item in projection.lineage
                            if item.predecessor_run_id is not None
                        ),
                        None,
                    )
                    await session.execute(
                        text(
                            """INSERT INTO entity_resolution_runs (
                                 workspace_id, resolution_run_id, resolver_version,
                                 evidence_checksum, mapping_checksum,
                                 predecessor_run_id, status
                               ) VALUES (
                                 :workspace_id, :run_id, :resolver_version,
                                 :evidence_checksum, :mapping_checksum,
                                 :predecessor_run_id, 'complete')"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "run_id": projection.resolution_run_id,
                            "resolver_version": projection.resolver_version,
                            "evidence_checksum": projection.evidence_checksum,
                            "mapping_checksum": projection.mapping_checksum,
                            "predecessor_run_id": predecessor,
                        },
                    )
                    await self._write_entities(session, workspace_id, projection)
                    await self._write_assignments(session, workspace_id, projection)
                    await self._write_lineage(session, workspace_id, projection)
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể ghi entity-resolution version vào RAG database."
            ) from error
        return projection

    @staticmethod
    async def _load_previous(session, workspace_id: UUID):
        run = (
            await session.execute(
                text(
                    """SELECT resolution_run_id, resolver_version,
                              evidence_checksum, mapping_checksum
                         FROM entity_resolution_runs
                        WHERE workspace_id = :workspace_id AND status = 'complete'
                        ORDER BY created_at DESC, resolution_run_id DESC LIMIT 1"""
                ),
                {"workspace_id": str(workspace_id)},
            )
        ).mappings().one_or_none()
        if run is None:
            return None
        params = {
            "workspace_id": str(workspace_id),
            "run_id": run["resolution_run_id"],
        }
        entity_rows = (
            await session.execute(
                text(
                    """SELECT canonical_entity_id, canonical_name, entity_type,
                              aliases, external_ids, disambiguation_attributes,
                              confidence
                         FROM canonical_entity_versions
                        WHERE workspace_id = :workspace_id
                          AND resolution_run_id = :run_id
                        ORDER BY canonical_entity_id"""
                ),
                params,
            )
        ).mappings().all()
        assignment_rows = (
            await session.execute(
                text(
                    """SELECT observation_id, revision_id, canonical_entity_id,
                              confidence, decision, rationale
                         FROM entity_resolution_assignments
                        WHERE workspace_id = :workspace_id
                          AND resolution_run_id = :run_id
                        ORDER BY observation_id"""
                ),
                params,
            )
        ).mappings().all()
        lineage_rows = (
            await session.execute(
                text(
                    """SELECT lineage_id, predecessor_run_id, event_type,
                              from_entity_ids, to_entity_ids, observation_ids,
                              confidence
                         FROM entity_resolution_lineage
                        WHERE workspace_id = :workspace_id
                          AND resolution_run_id = :run_id
                        ORDER BY lineage_id"""
                ),
                params,
            )
        ).mappings().all()
        return EntityResolutionProjection(
            **dict(run),
            entities=tuple(CanonicalEntityVersion.model_validate(row) for row in entity_rows),
            assignments=tuple(
                ResolutionAssignment.model_validate(row) for row in assignment_rows
            ),
            lineage=tuple(ResolutionLineage.model_validate(row) for row in lineage_rows),
        )

    @staticmethod
    async def _write_entities(session, workspace_id, projection) -> None:
        if projection.entities:
            await session.execute(
                text(
                    """INSERT INTO canonical_entity_versions (
                         workspace_id, resolution_run_id, canonical_entity_id,
                         canonical_name, entity_type, aliases, external_ids,
                         disambiguation_attributes, confidence
                       ) VALUES (
                         :workspace_id, :run_id, :canonical_entity_id,
                         :canonical_name, :entity_type, CAST(:aliases AS jsonb),
                         CAST(:external_ids AS jsonb), CAST(:attributes AS jsonb),
                         :confidence)"""
                ),
                [
                    {
                        "workspace_id": str(workspace_id),
                        "run_id": projection.resolution_run_id,
                        **item.model_dump(
                            mode="json",
                            exclude={"aliases", "external_ids", "disambiguation_attributes"},
                        ),
                        "aliases": json.dumps(item.aliases),
                        "external_ids": json.dumps(item.external_ids),
                        "attributes": json.dumps(
                            [value.model_dump(mode="json") for value in item.disambiguation_attributes]
                        ),
                    }
                    for item in projection.entities
                ],
            )

    @staticmethod
    async def _write_assignments(session, workspace_id, projection) -> None:
        if projection.assignments:
            await session.execute(
                text(
                    """INSERT INTO entity_resolution_assignments (
                         workspace_id, resolution_run_id, observation_id,
                         revision_id, canonical_entity_id, confidence,
                         decision, rationale
                       ) VALUES (
                         :workspace_id, :run_id, :observation_id, :revision_id,
                         :canonical_entity_id, :confidence, :decision, :rationale)"""
                ),
                [
                    {
                        "workspace_id": str(workspace_id),
                        "run_id": projection.resolution_run_id,
                        **item.model_dump(mode="json"),
                    }
                    for item in projection.assignments
                ],
            )

    @staticmethod
    async def _write_lineage(session, workspace_id, projection) -> None:
        if projection.lineage:
            await session.execute(
                text(
                    """INSERT INTO entity_resolution_lineage (
                         workspace_id, resolution_run_id, lineage_id,
                         predecessor_run_id, event_type, from_entity_ids,
                         to_entity_ids, observation_ids, confidence
                       ) VALUES (
                         :workspace_id, :run_id, :lineage_id,
                         :predecessor_run_id, :event_type,
                         CAST(:from_ids AS jsonb), CAST(:to_ids AS jsonb),
                         CAST(:observation_ids AS jsonb), :confidence)"""
                ),
                [
                    {
                        "workspace_id": str(workspace_id),
                        "run_id": projection.resolution_run_id,
                        **item.model_dump(
                            mode="json",
                            exclude={"from_entity_ids", "to_entity_ids", "observation_ids"},
                        ),
                        "from_ids": json.dumps([str(value) for value in item.from_entity_ids]),
                        "to_ids": json.dumps([str(value) for value in item.to_entity_ids]),
                        "observation_ids": json.dumps(
                            [str(value) for value in item.observation_ids]
                        ),
                    }
                    for item in projection.lineage
                ],
            )
