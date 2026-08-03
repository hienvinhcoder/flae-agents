"""Persistence boundary for immutable, evidence-derived graph semantics."""

from __future__ import annotations

import json
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.graph_semantics import (
    EntitySemanticEvidence,
    GraphSemanticBuildInput,
    GraphSemanticBuildResult,
    GraphSemanticProjection,
    RelationshipSemanticEvidence,
)


class GraphSemanticRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_evidence(
        self, command: GraphSemanticBuildInput
    ) -> tuple[
        tuple[EntitySemanticEvidence, ...],
        tuple[RelationshipSemanticEvidence, ...],
    ]:
        try:
            async with self._manager.get_ingestion_session(
                str(command.workspace_id)
            ) as session:
                linked = await session.scalar(
                    text(
                        """SELECT count(*)
                             FROM relationship_projection_versions
                            WHERE workspace_id = :workspace_id
                              AND projection_id = :projection_id
                              AND resolution_run_id = :resolution_run_id
                              AND status = 'complete'"""
                    ),
                    self._ids(command),
                )
                if linked != 1:
                    raise InvalidArgumentError(
                        "Semantic graph requires linked complete resolution and relationship projections."
                    )
                entity_rows = (
                    await session.execute(
                        text(
                            """SELECT observation.observation_id,
                                      assignment.canonical_entity_id,
                                      entity.canonical_name, entity.entity_type,
                                      observation.description, entity.aliases,
                                      observation.revision_id, observation.chunk_id
                                 FROM entity_resolution_assignments AS assignment
                                 JOIN entity_observations AS observation
                                   ON observation.workspace_id = assignment.workspace_id
                                  AND observation.observation_id = assignment.observation_id
                                 JOIN canonical_entity_versions AS entity
                                   ON entity.workspace_id = assignment.workspace_id
                                  AND entity.resolution_run_id = assignment.resolution_run_id
                                  AND entity.canonical_entity_id = assignment.canonical_entity_id
                                 JOIN document_revisions AS revision
                                   ON revision.workspace_id = observation.workspace_id
                                  AND revision.revision_id = observation.revision_id
                                WHERE assignment.workspace_id = :workspace_id
                                  AND assignment.resolution_run_id = :resolution_run_id
                                  AND assignment.canonical_entity_id IS NOT NULL
                                  AND revision.state = 'searchable'
                                  AND revision.base_readiness = 'ready'
                                ORDER BY observation.observation_id"""
                        ),
                        self._ids(command),
                    )
                ).mappings().all()
                relationship_rows = (
                    await session.execute(
                        text(
                            """SELECT relationship_id, subject_entity_id,
                                      predicate, object_entity_id, object_value,
                                      polarity, assertion_ids
                                 FROM canonical_relationship_versions
                                WHERE workspace_id = :workspace_id
                                  AND projection_id = :projection_id
                                ORDER BY relationship_id"""
                        ),
                        self._ids(command),
                    )
                ).mappings().all()
                assertion_rows = (
                    await session.execute(
                        text(
                            """SELECT assertion.assertion_id,
                                      assertion.revision_id, assertion.chunk_id,
                                      assertion.keywords, assertion.description
                                 FROM assertion_evidence AS assertion
                                 JOIN document_revisions AS revision
                                   ON revision.workspace_id = assertion.workspace_id
                                  AND revision.revision_id = assertion.revision_id
                                WHERE assertion.workspace_id = :workspace_id
                                  AND revision.state = 'searchable'
                                  AND revision.base_readiness = 'ready'"""
                        ),
                        self._ids(command),
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc semantic graph evidence."
            ) from error
        entities = tuple(
            EntitySemanticEvidence.model_validate(row) for row in entity_rows
        )
        names = {
            item.canonical_entity_id: item.canonical_name for item in entities
        }
        assertions = {row["assertion_id"]: row for row in assertion_rows}
        relationships: list[RelationshipSemanticEvidence] = []
        for relationship in relationship_rows:
            for assertion_id_value in relationship["assertion_ids"]:
                assertion_id = UUID(str(assertion_id_value))
                assertion = assertions.get(assertion_id)
                if assertion is None:
                    raise InvalidArgumentError(
                        "Relationship semantic evidence is stale or incomplete."
                    )
                object_entity_id = relationship["object_entity_id"]
                subject_name = names.get(relationship["subject_entity_id"])
                object_name = names.get(object_entity_id) if object_entity_id else None
                if subject_name is None or (
                    object_entity_id is not None and object_name is None
                ):
                    raise InvalidArgumentError(
                        "Relationship semantic endpoint lacks active entity evidence."
                    )
                relationships.append(
                    RelationshipSemanticEvidence(
                        assertion_id=assertion_id,
                        relationship_id=relationship["relationship_id"],
                        subject_entity_id=relationship["subject_entity_id"],
                        subject_name=subject_name,
                        predicate=relationship["predicate"],
                        object_entity_id=object_entity_id,
                        object_name=object_name,
                        object_value=relationship["object_value"],
                        polarity=relationship["polarity"],
                        keywords=tuple(assertion["keywords"]),
                        description=assertion["description"],
                        revision_id=assertion["revision_id"],
                        chunk_id=assertion["chunk_id"],
                    )
                )
        if not entities:
            raise InvalidArgumentError(
                "Semantic graph requires at least one active resolved entity."
            )
        return entities, tuple(relationships)

    async def find_existing(
        self, command: GraphSemanticBuildInput, *, input_checksum: str
    ) -> GraphSemanticBuildResult | None:
        profile = command.profile
        try:
            async with self._manager.get_ingestion_session(
                str(command.workspace_id)
            ) as session:
                row = (
                    await session.execute(
                        text(
                            """SELECT semantic_projection_id, resolution_run_id,
                                      relationship_projection_id, input_checksum,
                                      projection_checksum,
                                      (SELECT count(*) FROM entity_semantic_versions
                                        WHERE workspace_id = projection.workspace_id
                                          AND semantic_projection_id = projection.semantic_projection_id)
                                        AS entity_count,
                                      (SELECT count(*) FROM relationship_semantic_versions
                                        WHERE workspace_id = projection.workspace_id
                                          AND semantic_projection_id = projection.semantic_projection_id)
                                        AS relationship_count,
                                      (SELECT count(*) FROM semantic_graph_mappings
                                        WHERE workspace_id = projection.workspace_id
                                          AND semantic_projection_id = projection.semantic_projection_id)
                                        AS mapping_count
                                 FROM graph_semantic_projections AS projection
                                WHERE workspace_id = :workspace_id
                                  AND resolution_run_id = :resolution_run_id
                                  AND relationship_projection_id = :projection_id
                                  AND profile_version = :profile_version
                                  AND embedding_model = :embedding_model
                                  AND embedding_dimension = :embedding_dimension
                                  AND embedding_policy_version = :embedding_policy_version
                                  AND input_checksum = :input_checksum
                                  AND status = 'complete'"""
                        ),
                        {
                            **self._ids(command),
                            "profile_version": profile.profile_version,
                            "embedding_model": profile.embedding_model,
                            "embedding_dimension": profile.embedding_dimension,
                            "embedding_policy_version": profile.embedding_policy_version,
                            "input_checksum": input_checksum,
                        },
                    )
                ).mappings().one_or_none()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc semantic graph projection."
            ) from error
        return GraphSemanticBuildResult.model_validate(row) if row else None

    async def persist(
        self,
        command: GraphSemanticBuildInput,
        projection: GraphSemanticProjection,
        *,
        input_checksum: str,
    ) -> GraphSemanticBuildResult:
        identity = (
            f"semantic:{command.workspace_id}:{command.resolution_run_id}:"
            f"{command.relationship_projection_id}:{command.profile.profile_version}:"
            f"{input_checksum}:{projection.projection_checksum}"
        )
        semantic_projection_id = uuid5(NAMESPACE_URL, identity)
        try:
            async with self._manager.get_ingestion_session(
                str(command.workspace_id)
            ) as session:
                try:
                    await self._write_parent(
                        session,
                        command,
                        semantic_projection_id,
                        input_checksum,
                        projection.projection_checksum,
                    )
                    await self._write_entities(
                        session, command.workspace_id, semantic_projection_id, projection
                    )
                    await self._write_relationships(
                        session, command.workspace_id, semantic_projection_id, projection
                    )
                    await self._write_mappings(
                        session, command.workspace_id, semantic_projection_id, projection
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể persist semantic graph projection."
            ) from error
        return self._result(
            command,
            semantic_projection_id,
            input_checksum,
            projection,
        )

    @staticmethod
    async def _write_parent(
        session, command, semantic_projection_id, input_checksum, projection_checksum
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
        session, workspace_id: UUID, semantic_projection_id: UUID, projection
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
                        mode="json", exclude={"aliases", "observation_ids", "revision_ids", "chunk_ids", "embedding"}
                    ),
                    "aliases": json.dumps(item.aliases),
                    "observation_ids": json.dumps([str(value) for value in item.observation_ids]),
                    "revision_ids": json.dumps([str(value) for value in item.revision_ids]),
                    "chunk_ids": json.dumps(item.chunk_ids),
                    "semantic_input_checksum": item.embedding.semantic_input_checksum,
                    "embedding": json.dumps(item.embedding.vector),
                }
                for item in projection.entities
            ],
        )

    @staticmethod
    async def _write_relationships(
        session, workspace_id: UUID, semantic_projection_id: UUID, projection
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
                        mode="json", exclude={"keywords", "assertion_ids", "revision_ids", "chunk_ids", "embedding"}
                    ),
                    "keywords": json.dumps(item.keywords),
                    "assertion_ids": json.dumps([str(value) for value in item.assertion_ids]),
                    "revision_ids": json.dumps([str(value) for value in item.revision_ids]),
                    "chunk_ids": json.dumps(item.chunk_ids),
                    "semantic_input_checksum": item.embedding.semantic_input_checksum,
                    "embedding": json.dumps(item.embedding.vector),
                }
                for item in projection.relationships
            ],
        )

    @staticmethod
    async def _write_mappings(
        session, workspace_id: UUID, semantic_projection_id: UUID, projection
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

    @staticmethod
    def _ids(command: GraphSemanticBuildInput) -> dict[str, object]:
        return {
            "workspace_id": str(command.workspace_id),
            "resolution_run_id": command.resolution_run_id,
            "projection_id": command.relationship_projection_id,
        }

    @staticmethod
    def _result(
        command,
        semantic_projection_id,
        input_checksum,
        projection,
    ) -> GraphSemanticBuildResult:
        return GraphSemanticBuildResult(
            semantic_projection_id=semantic_projection_id,
            resolution_run_id=command.resolution_run_id,
            relationship_projection_id=command.relationship_projection_id,
            input_checksum=input_checksum,
            projection_checksum=projection.projection_checksum,
            entity_count=len(projection.entities),
            relationship_count=len(projection.relationships),
            mapping_count=len(projection.mappings),
        )
