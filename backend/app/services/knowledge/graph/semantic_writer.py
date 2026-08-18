"""Transactional writer for immutable semantic graph projections."""

from __future__ import annotations

import json
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.graph_semantics import (
    GraphSemanticBuildInput,
    GraphSemanticProjection,
)


class GraphSemanticWriter:
    @staticmethod
    async def write(
        session: AsyncSession,
        command: GraphSemanticBuildInput,
        semantic_projection_id: UUID,
        input_checksum: str,
        projection: GraphSemanticProjection,
    ) -> None:
        await GraphSemanticWriter._write_parent(
            session,
            command,
            semantic_projection_id,
            input_checksum,
            projection.projection_checksum,
        )
        await GraphSemanticWriter._write_entities(
            session, command.workspace_id, semantic_projection_id, projection
        )
        await GraphSemanticWriter._write_relationships(
            session, command.workspace_id, semantic_projection_id, projection
        )
        await GraphSemanticWriter._write_mappings(
            session, command.workspace_id, semantic_projection_id, projection
        )

    @staticmethod
    async def _write_parent(
        session: AsyncSession,
        command: GraphSemanticBuildInput,
        semantic_projection_id: UUID,
        input_checksum: str,
        projection_checksum: str,
    ) -> None:
        profile = command.profile
        await session.execute(
            text(
                """INSERT INTO graph_semantic_projections (
                     workspace_id, semantic_projection_id, resolution_run_id,
                     relationship_projection_id, profile_version,
                     embedding_model, embedding_dimension,
                     embedding_policy_version, input_checksum,
                     projection_checksum, status
                   ) VALUES (
                     :workspace_id, :semantic_projection_id, :resolution_run_id,
                     :projection_id, :profile_version, :embedding_model,
                     :embedding_dimension, :embedding_policy_version,
                     :input_checksum, :projection_checksum, 'complete')"""
            ),
            {
                "workspace_id": str(command.workspace_id),
                "semantic_projection_id": semantic_projection_id,
                "resolution_run_id": command.resolution_run_id,
                "projection_id": command.relationship_projection_id,
                "profile_version": profile.profile_version,
                "embedding_model": profile.embedding_model,
                "embedding_dimension": profile.embedding_dimension,
                "embedding_policy_version": profile.embedding_policy_version,
                "input_checksum": input_checksum,
                "projection_checksum": projection_checksum,
            },
        )

    @staticmethod
    async def _write_entities(
        session: AsyncSession,
        workspace_id: UUID,
        semantic_projection_id: UUID,
        projection: GraphSemanticProjection,
    ) -> None:
        if not projection.entities:
            return
        await session.execute(
            text(
                """INSERT INTO entity_semantic_versions (
                     workspace_id, semantic_projection_id, entity_id,
                     canonical_name, entity_type, aliases, description,
                     observation_ids, revision_ids, chunk_ids, frequency, degree,
                     semantic_input, semantic_input_checksum, embedding
                   ) VALUES (
                     :workspace_id, :semantic_projection_id, :entity_id,
                     :canonical_name, :entity_type, CAST(:aliases AS jsonb),
                     :description, CAST(:observation_ids AS jsonb),
                     CAST(:revision_ids AS jsonb), CAST(:chunk_ids AS jsonb),
                     :frequency, :degree, :semantic_input,
                     :semantic_input_checksum, CAST(:embedding AS vector))"""
            ),
            [
                {
                    "workspace_id": str(workspace_id),
                    "semantic_projection_id": semantic_projection_id,
                    **item.model_dump(
                        mode="json",
                        exclude={
                            "aliases",
                            "observation_ids",
                            "revision_ids",
                            "chunk_ids",
                            "embedding",
                        },
                    ),
                    "aliases": json.dumps(item.aliases),
                    "observation_ids": json.dumps(
                        [str(value) for value in item.observation_ids]
                    ),
                    "revision_ids": json.dumps(
                        [str(value) for value in item.revision_ids]
                    ),
                    "chunk_ids": json.dumps(item.chunk_ids),
                    "semantic_input_checksum": item.embedding.semantic_input_checksum,
                    "embedding": json.dumps(item.embedding.vector),
                }
                for item in projection.entities
            ],
        )

    @staticmethod
    async def _write_relationships(
        session: AsyncSession,
        workspace_id: UUID,
        semantic_projection_id: UUID,
        projection: GraphSemanticProjection,
    ) -> None:
        if not projection.relationships:
            return
        await session.execute(
            text(
                """INSERT INTO relationship_semantic_versions (
                     workspace_id, semantic_projection_id, relationship_id,
                     subject_entity_id, predicate, object_entity_id, object_value,
                     polarity, keywords, description, assertion_ids, revision_ids,
                     chunk_ids, frequency, degree, semantic_input,
                     semantic_input_checksum, embedding
                   ) VALUES (
                     :workspace_id, :semantic_projection_id, :relationship_id,
                     :subject_entity_id, :predicate, :object_entity_id, :object_value,
                     :polarity, CAST(:keywords AS jsonb), :description,
                     CAST(:assertion_ids AS jsonb), CAST(:revision_ids AS jsonb),
                     CAST(:chunk_ids AS jsonb), :frequency, :degree, :semantic_input,
                     :semantic_input_checksum, CAST(:embedding AS vector))"""
            ),
            [
                {
                    "workspace_id": str(workspace_id),
                    "semantic_projection_id": semantic_projection_id,
                    **item.model_dump(
                        mode="json",
                        exclude={
                            "keywords",
                            "assertion_ids",
                            "revision_ids",
                            "chunk_ids",
                            "embedding",
                        },
                    ),
                    "keywords": json.dumps(item.keywords),
                    "assertion_ids": json.dumps(
                        [str(value) for value in item.assertion_ids]
                    ),
                    "revision_ids": json.dumps(
                        [str(value) for value in item.revision_ids]
                    ),
                    "chunk_ids": json.dumps(item.chunk_ids),
                    "semantic_input_checksum": item.embedding.semantic_input_checksum,
                    "embedding": json.dumps(item.embedding.vector),
                }
                for item in projection.relationships
            ],
        )

    @staticmethod
    async def _write_mappings(
        session: AsyncSession,
        workspace_id: UUID,
        semantic_projection_id: UUID,
        projection: GraphSemanticProjection,
    ) -> None:
        if not projection.mappings:
            return
        rows = []
        for item in projection.mappings:
            identity = (
                f"semantic-mapping:{semantic_projection_id}:{item.chunk_id}:"
                f"{item.target_kind}:{item.target_id}:{item.evidence_id}"
            )
            rows.append(
                {
                    "workspace_id": str(workspace_id),
                    "semantic_projection_id": semantic_projection_id,
                    "mapping_id": uuid5(NAMESPACE_URL, identity),
                    **item.model_dump(mode="json"),
                }
            )
        await session.execute(
            text(
                """INSERT INTO semantic_graph_mappings (
                     workspace_id, semantic_projection_id, mapping_id,
                     revision_id, chunk_id, target_kind, target_id, evidence_id
                   ) VALUES (
                     :workspace_id, :semantic_projection_id, :mapping_id,
                     :revision_id, :chunk_id, :target_kind, :target_id, :evidence_id)"""
            ),
            rows,
        )
