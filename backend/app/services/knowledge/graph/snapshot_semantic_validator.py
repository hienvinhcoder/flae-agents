"""Completeness validation for semantic C-G-M snapshot publication."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidArgumentError


@dataclass(frozen=True)
class SemanticGraphValidation:
    semantic_projection_id: UUID
    projection_checksum: str
    entity_count: int
    relationship_count: int
    mapping_count: int


async def load_graph_projection(
    session: AsyncSession, workspace_id: UUID, projection_id: UUID | None
) -> dict[str, object]:
    clause = (
        "AND projection.projection_id = :projection_id"
        if projection_id is not None
        else ""
    )
    row = (
        await session.execute(
            text(
                """SELECT projection.projection_id,
                          projection.resolution_run_id,
                          projection.revision_set_checksum,
                          projection.projection_checksum,
                          resolution.mapping_checksum
                     FROM relationship_projection_versions AS projection
                     JOIN entity_resolution_runs AS resolution
                       ON resolution.workspace_id = projection.workspace_id
                      AND resolution.resolution_run_id = projection.resolution_run_id
                    WHERE projection.workspace_id = :workspace_id
                      AND projection.status = 'complete' """
                + clause
                + " ORDER BY projection.created_at DESC, projection.projection_id DESC LIMIT 1"
            ),
            {
                "workspace_id": str(workspace_id),
                "projection_id": projection_id,
            },
        )
    ).mappings().one_or_none()
    if row is None:
        raise InvalidArgumentError(
            "Graph snapshot requires a complete relationship projection."
        )
    return dict(row)


async def load_current_revisions(
    session: AsyncSession, workspace_id: UUID, *, lock: bool
) -> list[dict[str, object]]:
    suffix = " FOR SHARE" if lock else ""
    rows = (
        await session.execute(
            text(
                """SELECT revision_id, content_checksum, acl_checksum
                     FROM document_revisions
                    WHERE workspace_id = :workspace_id
                      AND state = 'searchable'
                      AND base_readiness = 'ready'
                    ORDER BY revision_id"""
                + suffix
            ),
            {"workspace_id": str(workspace_id)},
        )
    ).mappings().all()
    if not rows:
        raise InvalidArgumentError(
            "Graph snapshot requires at least one current revision."
        )
    return [dict(row) for row in rows]


async def validate_relationship_projection(
    session: AsyncSession, workspace_id: UUID, projection_id: UUID
) -> tuple[int, int]:
    invalid_frequency = await session.scalar(
        text(
            """SELECT count(*) FROM canonical_relationship_versions
                WHERE workspace_id = :workspace_id
                  AND projection_id = :projection_id
                  AND (frequency <> jsonb_array_length(assertion_ids)
                       OR frequency <> (
                         SELECT count(DISTINCT value)
                           FROM jsonb_array_elements_text(assertion_ids) AS value
                       ))"""
        ),
        {"workspace_id": str(workspace_id), "projection_id": projection_id},
    )
    if invalid_frequency:
        raise InvalidArgumentError(
            "Graph projection contains inflated relationship frequency."
        )
    counts = (
        await session.execute(
            text(
                """SELECT count(*) AS total,
                          count(*) FILTER (
                            WHERE revision.state = 'searchable'
                              AND revision.base_readiness = 'ready'
                          ) AS current_count
                     FROM graph_mappings AS mapping
                     JOIN document_revisions AS revision
                       ON revision.workspace_id = mapping.workspace_id
                      AND revision.revision_id = mapping.revision_id
                    WHERE mapping.workspace_id = :workspace_id
                      AND mapping.projection_id = :projection_id"""
            ),
            {"workspace_id": str(workspace_id), "projection_id": projection_id},
        )
    ).mappings().one()
    if counts["total"] != counts["current_count"]:
        raise InvalidArgumentError(
            "Graph projection contains stale or unauthorized mappings."
        )
    relationship_count = await session.scalar(
        text(
            """SELECT count(*) FROM canonical_relationship_versions
                WHERE workspace_id = :workspace_id
                  AND projection_id = :projection_id"""
        ),
        {"workspace_id": str(workspace_id), "projection_id": projection_id},
    )
    return int(relationship_count or 0), int(counts["total"])


async def validate_complete_semantic_projection(
    session: AsyncSession,
    workspace_id: UUID,
    *,
    resolution_run_id: UUID,
    relationship_projection_id: UUID,
    semantic_projection_id: UUID,
) -> SemanticGraphValidation:
    parent = (
        await session.execute(
            text(
                """SELECT projection_checksum
                     FROM graph_semantic_projections
                    WHERE workspace_id = :workspace_id
                      AND semantic_projection_id = :semantic_projection_id
                      AND resolution_run_id = :resolution_run_id
                      AND relationship_projection_id = :relationship_projection_id
                      AND status = 'complete'"""
            ),
            _parameters(
                workspace_id,
                resolution_run_id,
                relationship_projection_id,
                semantic_projection_id,
            ),
        )
    ).mappings().one_or_none()
    if parent is None:
        raise InvalidArgumentError(
            "Graph snapshot requires a linked complete semantic projection."
        )

    counts = (
        await session.execute(
            text(
                """SELECT
                     (SELECT count(*) FROM entity_semantic_versions
                       WHERE workspace_id = :workspace_id
                         AND semantic_projection_id = :semantic_projection_id)
                       AS entity_count,
                     (SELECT count(*) FROM canonical_entity_versions
                       WHERE workspace_id = :workspace_id
                         AND resolution_run_id = :resolution_run_id)
                       AS expected_entity_count,
                     (SELECT count(*) FROM relationship_semantic_versions
                       WHERE workspace_id = :workspace_id
                         AND semantic_projection_id = :semantic_projection_id)
                       AS relationship_count,
                     (SELECT count(*) FROM canonical_relationship_versions
                       WHERE workspace_id = :workspace_id
                         AND projection_id = :relationship_projection_id)
                       AS expected_relationship_count,
                     (SELECT count(*) FROM semantic_graph_mappings
                       WHERE workspace_id = :workspace_id
                         AND semantic_projection_id = :semantic_projection_id)
                       AS mapping_count,
                     (SELECT coalesce(sum(frequency), 0) FROM entity_semantic_versions
                       WHERE workspace_id = :workspace_id
                         AND semantic_projection_id = :semantic_projection_id)
                     + 2 *
                     (SELECT coalesce(sum(frequency), 0)
                        FROM relationship_semantic_versions
                       WHERE workspace_id = :workspace_id
                         AND semantic_projection_id = :semantic_projection_id)
                       AS expected_mapping_count,
                     (SELECT count(*) FROM entity_semantic_versions AS entity
                       WHERE entity.workspace_id = :workspace_id
                         AND entity.semantic_projection_id = :semantic_projection_id
                         AND (entity.frequency <> jsonb_array_length(entity.observation_ids)
                           OR entity.degree <> (
                              SELECT count(*)
                                FROM relationship_semantic_versions AS relationship
                               WHERE relationship.workspace_id = entity.workspace_id
                                 AND relationship.semantic_projection_id = entity.semantic_projection_id
                                 AND (relationship.subject_entity_id = entity.entity_id
                                   OR relationship.object_entity_id = entity.entity_id))))
                       AS invalid_entity_count,
                     (SELECT count(*)
                        FROM relationship_semantic_versions AS relationship
                        JOIN entity_semantic_versions AS subject
                          ON subject.workspace_id = relationship.workspace_id
                         AND subject.semantic_projection_id = relationship.semantic_projection_id
                         AND subject.entity_id = relationship.subject_entity_id
                   LEFT JOIN entity_semantic_versions AS object_entity
                          ON object_entity.workspace_id = relationship.workspace_id
                         AND object_entity.semantic_projection_id = relationship.semantic_projection_id
                         AND object_entity.entity_id = relationship.object_entity_id
                       WHERE relationship.workspace_id = :workspace_id
                         AND relationship.semantic_projection_id = :semantic_projection_id
                         AND (relationship.frequency <> jsonb_array_length(relationship.assertion_ids)
                           OR relationship.degree <> subject.degree + coalesce(object_entity.degree, 0)))
                       AS invalid_relationship_count,
                     (SELECT count(*) FROM semantic_graph_mappings AS mapping
                        LEFT JOIN document_revisions AS revision
                          ON revision.workspace_id = mapping.workspace_id
                         AND revision.revision_id = mapping.revision_id
                       WHERE mapping.workspace_id = :workspace_id
                         AND mapping.semantic_projection_id = :semantic_projection_id
                         AND (revision.revision_id IS NULL
                           OR revision.state <> 'searchable'
                           OR revision.base_readiness <> 'ready'))
                       AS stale_mapping_count"""
            ),
            _parameters(
                workspace_id,
                resolution_run_id,
                relationship_projection_id,
                semantic_projection_id,
            ),
        )
    ).mappings().one()
    entity_count = int(counts["entity_count"])
    relationship_count = int(counts["relationship_count"])
    mapping_count = int(counts["mapping_count"])
    if entity_count < 1 or entity_count != counts["expected_entity_count"]:
        raise InvalidArgumentError(
            "Semantic graph does not cover every canonical entity."
        )
    if relationship_count != counts["expected_relationship_count"]:
        raise InvalidArgumentError(
            "Semantic graph does not cover every canonical relationship."
        )
    if mapping_count < 1 or mapping_count != counts["expected_mapping_count"]:
        raise InvalidArgumentError("Semantic graph mappings are incomplete.")
    if (
        counts["invalid_entity_count"]
        or counts["invalid_relationship_count"]
        or counts["stale_mapping_count"]
    ):
        raise InvalidArgumentError(
            "Semantic graph contains invalid degrees, frequencies, or evidence mappings."
        )
    return SemanticGraphValidation(
        semantic_projection_id=semantic_projection_id,
        projection_checksum=str(parent["projection_checksum"]),
        entity_count=entity_count,
        relationship_count=relationship_count,
        mapping_count=mapping_count,
    )


def _parameters(
    workspace_id: UUID,
    resolution_run_id: UUID,
    relationship_projection_id: UUID,
    semantic_projection_id: UUID,
) -> dict[str, object]:
    return {
        "workspace_id": str(workspace_id),
        "resolution_run_id": resolution_run_id,
        "relationship_projection_id": relationship_projection_id,
        "semantic_projection_id": semantic_projection_id,
    }
