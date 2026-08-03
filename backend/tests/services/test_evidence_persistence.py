from datetime import UTC, datetime
import json
from uuid import UUID, uuid4

import psycopg2
import pytest
import numpy as np
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import DBManager
from app.db.rag_repository import AuthorizationContext
from app.schemas.enrichment import (
    EvidenceBatchPlanInput,
    EvidenceExtractionActivityInput,
    EvidenceExtractionCandidateBatch,
    EvidenceManifestVerificationInput,
)
from app.services.knowalge_base.evidence_service import EvidenceService
from app.services.knowalge_base.evidence_workflow_service import (
    EvidenceWorkflowService,
)
from app.services.knowalge_base.entity_resolution_service import (
    EntityResolutionService,
)
from app.services.knowalge_base.graph_projection_service import (
    GraphProjectionService,
)
from app.services.knowalge_base.graph_snapshot_service import GraphSnapshotService
from app.services.knowalge_base.canonical_query_repository import (
    CanonicalQueryRepository,
)
from app.services.knowalge_base.knowledge_query_service import KnowledgeQueryService
from app.schemas.memory_query import MemoryQueryRequest
from app.schemas.graph_semantics import DemoIngestionProfile, GraphSemanticBuildInput
from app.services.knowalge_base.graph_semantic_projection_service import (
    GraphSemanticProjectionService,
)


CHUNK_TEXT = "Atlas Edge uses Minh Stream."


def _connect():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def _arrange_current_chunk() -> EvidenceExtractionActivityInput:
    workspace_id = uuid4()
    source_id = uuid4()
    document_id = uuid4()
    revision_id = uuid4()
    run_id = uuid4()
    chunk_id = "chk_atlas_edge"
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO document_revisions (
              workspace_id, revision_id, source_id, document_id,
              source_external_id, source_version_key, content_checksum,
              acl_checksum, state, base_readiness, graph_readiness,
              discovery_readiness, acl_scope, acl_principal_ids
            ) VALUES (%s, %s, %s, %s, 'doc-evidence', 'v1', %s, %s,
                      'searchable', 'ready', 'pending', 'pending',
                      'workspace', '[]'::jsonb)
            """,
            (
                str(workspace_id),
                str(revision_id),
                str(source_id),
                str(document_id),
                "sha256:" + "a" * 64,
                "sha256:" + "b" * 64,
            ),
        )
        cursor.execute(
            """
            INSERT INTO ingestion_runs (
              workspace_id, run_id, revision_id, pipeline_version,
              input_checksum, status
            ) VALUES (%s, %s, %s, 'pipeline-v2', %s, 'running')
            """,
            (
                str(workspace_id),
                str(run_id),
                str(revision_id),
                "sha256:" + "c" * 64,
            ),
        )
        cursor.execute(
            """
            INSERT INTO chunks (
              workspace_id, chunk_id, text, token_count, revision_id,
              source_id, document_id, heading_path, location_kind,
              location_data, content_hash, parser_version, chunker_version,
              pipeline_version, source_name, source_type, source_modified_at,
              ingested_at, acl_scope, acl_principal_ids
            ) VALUES (
              %s, %s, %s, 5, %s, %s, %s, '["Overview"]'::jsonb,
              'section', '{"heading_path":["Overview"]}'::jsonb, %s,
              'markdown-v2', 'structure-v2', 'pipeline-v2', 'Atlas notes',
              'gcs', %s, %s, 'workspace', '[]'::jsonb
            )
            """,
            (
                str(workspace_id),
                chunk_id,
                CHUNK_TEXT,
                str(revision_id),
                str(source_id),
                str(document_id),
                "sha256:" + "d" * 64,
                datetime(2026, 7, 30, tzinfo=UTC),
                datetime(2026, 7, 30, tzinfo=UTC),
            ),
        )
    return EvidenceExtractionActivityInput(
        workspace_id=workspace_id,
        ingestion_run_id=run_id,
        revision_id=revision_id,
        chunk_id=chunk_id,
        extractor_version="evidence-v1",
        model_name="gemini-2.5-flash",
    )


def _candidates() -> EvidenceExtractionCandidateBatch:
    return EvidenceExtractionCandidateBatch.model_validate(
        {
            "observations": [
                {
                    "mention_key": "atlas",
                    "raw_mention": "Atlas Edge",
                    "normalized_mention": "atlas edge",
                    "proposed_type": "project",
                    "description": "Atlas Edge is a project.",
                    "evidence_start": 0,
                    "evidence_end": 10,
                    "confidence": 0.98,
                    "external_ids": ["project:atlas-edge"],
                    "disambiguation_attributes": [
                        {"name": "repository", "value": "atlas-edge"}
                    ],
                },
                {
                    "mention_key": "stream",
                    "raw_mention": "Minh Stream",
                    "normalized_mention": "minh stream",
                    "proposed_type": "library",
                    "description": "Minh Stream is a library.",
                    "evidence_start": 16,
                    "evidence_end": 27,
                    "confidence": 0.97,
                    "external_ids": ["package:minh-stream"],
                },
            ],
            "assertions": [
                {
                    "subject_mention_key": "atlas",
                    "predicate": "uses",
                    "object_mention_key": "stream",
                    "polarity": "affirmed",
                    "keywords": ["uses"],
                    "description": "Atlas Edge uses Minh Stream.",
                    "confidence": 0.96,
                    "evidence_start": 0,
                    "evidence_end": len(CHUNK_TEXT),
                    "qualifiers": [
                        {"name": "environment", "text_value": "production"}
                    ],
                }
            ],
        }
    )


def _counts(workspace_id: UUID) -> tuple[int, int, int, int]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              (SELECT count(*) FROM entity_observations WHERE workspace_id = %s),
              (SELECT count(*) FROM assertion_evidence WHERE workspace_id = %s),
              (SELECT count(*) FROM assertion_qualifiers WHERE workspace_id = %s),
              (SELECT count(*) FROM stage_manifests
                 WHERE workspace_id = %s AND stage_name = 'evidence')
            """,
            (str(workspace_id),) * 4,
        )
        return cursor.fetchone()


@pytest.mark.asyncio
async def test_evidence_persistence_is_atomic_and_idempotent() -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    service = EvidenceService(manager)
    try:
        context = await service.load_current_context(command)
        assert context.chunk_text == CHUNK_TEXT
        first = await service.persist_candidates(command, _candidates())
        second = await service.persist_candidates(command, _candidates())
    finally:
        await manager.close()

    assert first == second
    assert first.observation_count == 2
    assert first.assertion_count == 1
    assert _counts(command.workspace_id) == (2, 1, 1, 1)

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT predicate FROM assertion_evidence
               WHERE workspace_id = %s""",
            (str(command.workspace_id),),
        )
        assert cursor.fetchone() == ("uses",)
        for table in ("entities", "relationships", "topics", "topic_memberships"):
            cursor.execute(
                f"SELECT count(*) FROM {table} WHERE workspace_id = %s",
                (str(command.workspace_id),),
            )
            assert cursor.fetchone() == (0,)


@pytest.mark.asyncio
async def test_evidence_workflow_plans_refs_and_verifies_complete_manifests() -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    workflow_service = EvidenceWorkflowService(manager)
    try:
        plan = await workflow_service.plan_batch(
            EvidenceBatchPlanInput(
                workspace_id=command.workspace_id,
                ingestion_run_id=command.ingestion_run_id,
                revision_id=command.revision_id,
                extractor_version=command.extractor_version,
                model_name=command.model_name,
            )
        )
        persisted = await EvidenceService(manager).persist_candidates(
            command, _candidates()
        )
        verified = await workflow_service.verify_manifests(
            EvidenceManifestVerificationInput(
                workspace_id=command.workspace_id,
                ingestion_run_id=command.ingestion_run_id,
                revision_id=command.revision_id,
                extractor_version=command.extractor_version,
                expected_chunk_count=1,
                expected_observation_count=persisted.observation_count,
                expected_assertion_count=persisted.assertion_count,
            )
        )
    finally:
        await manager.close()

    assert tuple(item.chunk_id for item in plan.items) == (command.chunk_id,)
    assert plan.next_cursor is None
    assert verified.chunk_count == 1
    assert verified.observation_count == 2
    assert verified.assertion_count == 1


@pytest.mark.asyncio
async def test_evidence_failure_rolls_back_all_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    service = EvidenceService(manager)

    def fail(boundary: str) -> None:
        if boundary == "observations_written":
            raise RuntimeError("injected evidence failure")

    monkeypatch.setattr(service, "_after_write_boundary", fail)
    try:
        with pytest.raises(RuntimeError, match="injected evidence failure"):
            await service.persist_candidates(command, _candidates())
    finally:
        await manager.close()

    assert _counts(command.workspace_id) == (0, 0, 0, 0)


@pytest.mark.asyncio
async def test_stale_revision_or_unknown_chunk_is_rejected() -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    service = EvidenceService(manager)
    try:
        with _connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE document_revisions SET state = 'superseded'
                   WHERE workspace_id = %s AND revision_id = %s""",
                (str(command.workspace_id), str(command.revision_id)),
            )
        with pytest.raises(InvalidArgumentError, match="current searchable"):
            await service.persist_candidates(command, _candidates())

        unknown = command.model_copy(update={"chunk_id": "missing"})
        with pytest.raises(InvalidArgumentError, match="current searchable"):
            await service.load_current_context(unknown)
    finally:
        await manager.close()


@pytest.mark.asyncio
async def test_entity_resolution_version_persists_idempotently() -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    try:
        await EvidenceService(manager).persist_candidates(command, _candidates())
        resolver = EntityResolutionService(manager)
        first = await resolver.resolve_workspace(
            command.workspace_id, resolver_version="resolver-v1"
        )
        second = await resolver.resolve_workspace(
            command.workspace_id, resolver_version="resolver-v1"
        )
    finally:
        await manager.close()

    assert first == second
    assert len(first.entities) == 2
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT
                 (SELECT count(*) FROM entity_resolution_runs
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM canonical_entity_versions
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM entity_resolution_assignments
                   WHERE workspace_id = %s)""",
            (str(command.workspace_id),) * 3,
        )
        assert cursor.fetchone() == (1, 2, 2)


@pytest.mark.asyncio
async def test_relationship_projection_persists_without_retry_inflation() -> None:
    command = _arrange_current_chunk()
    manager = DBManager()
    try:
        await EvidenceService(manager).persist_candidates(command, _candidates())
        await EntityResolutionService(manager).resolve_workspace(
            command.workspace_id, resolver_version="resolver-v1"
        )
        service = GraphProjectionService(manager)
        first = await service.project_workspace(
            command.workspace_id, projection_version="projection-v1"
        )
        second = await service.project_workspace(
            command.workspace_id, projection_version="projection-v1"
        )
    finally:
        await manager.close()

    assert first == second
    assert first.relationships[0].predicate == "uses"
    assert first.relationships[0].frequency == 1
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT
                 (SELECT count(*) FROM relationship_projection_versions
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM canonical_relationship_versions
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM graph_mappings
                   WHERE workspace_id = %s)""",
            (str(command.workspace_id),) * 3,
        )
        assert cursor.fetchone() == (1, 1, 4)


async def _prepare_graph(manager: DBManager):
    command = _arrange_current_chunk()
    await EvidenceService(manager).persist_candidates(command, _candidates())
    await EntityResolutionService(manager).resolve_workspace(
        command.workspace_id, resolver_version="resolver-v1"
    )
    projection = await GraphProjectionService(manager).project_workspace(
        command.workspace_id, projection_version="projection-v1"
    )
    return command, projection


@pytest.mark.asyncio
async def test_graph_semantics_persist_and_reuse_one_complete_embedding_batch() -> None:
    manager = DBManager()
    calls: list[tuple[str, ...]] = []

    def embed(
        semantic_inputs: tuple[str, ...], dimension: int
    ) -> tuple[tuple[float, ...], ...]:
        calls.append(semantic_inputs)
        return tuple((0.5,) * dimension for _ in semantic_inputs)

    try:
        command, graph = await _prepare_graph(manager)
        service = GraphSemanticProjectionService(manager)
        build = GraphSemanticBuildInput(
            workspace_id=command.workspace_id,
            resolution_run_id=graph.resolution_run_id,
            relationship_projection_id=graph.projection_id,
            profile=DemoIngestionProfile(
                profile_version="demo-reference-v1",
                embedding_model="fixture-embedding-v1",
                embedding_dimension=1024,
                embedding_policy_version="semantic-input-v1",
            ),
        )
        first = await service.build_workspace(build, embedder=embed)
        replay = await service.build_workspace(build, embedder=embed)
    finally:
        await manager.close()

    assert first == replay
    assert first.entity_count == 2
    assert first.relationship_count == 1
    assert first.mapping_count == 4
    assert len(calls) == 1
    assert len(calls[0]) == 3


@pytest.mark.asyncio
async def test_graph_snapshot_publish_is_atomic_current_and_auditable() -> None:
    manager = DBManager()
    try:
        command, projection = await _prepare_graph(manager)
        service = GraphSnapshotService(manager)
        first = await service.publish(
            command.workspace_id, projection_id=projection.projection_id
        )
        second = await service.publish(
            command.workspace_id, projection_id=projection.projection_id
        )
    finally:
        await manager.close()

    assert first == second
    assert first.revision_count == 1
    assert first.relationship_count == 1
    assert first.mapping_count == 4
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT relationship.predicate, mapping.assertion_id,
                      assertion.chunk_id
                 FROM current_canonical_relationships AS relationship
                 JOIN current_graph_mappings AS mapping
                   ON mapping.workspace_id = relationship.workspace_id
                  AND mapping.projection_id = relationship.projection_id
                  AND mapping.target_kind = 'relationship'
                  AND mapping.target_id = relationship.relationship_id
                 JOIN assertion_evidence AS assertion
                   ON assertion.workspace_id = mapping.workspace_id
                  AND assertion.assertion_id = mapping.assertion_id
                WHERE relationship.workspace_id = %s""",
            (str(command.workspace_id),),
        )
        assert cursor.fetchone()[0::2] == ("uses", command.chunk_id)


@pytest.mark.asyncio
async def test_stale_projection_and_partial_snapshot_cannot_publish(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    manager = DBManager()
    try:
        command, projection = await _prepare_graph(manager)
        with _connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO document_revisions (
                     workspace_id, revision_id, source_id, document_id,
                     source_external_id, source_version_key, content_checksum,
                     acl_checksum, state, base_readiness, graph_readiness,
                     discovery_readiness, acl_scope, acl_principal_ids
                   ) VALUES (
                     %s, %s, %s, %s, 'doc-concurrent', 'v1', %s, %s,
                     'searchable', 'ready', 'pending', 'pending',
                     'workspace', '[]'::jsonb)""",
                (
                    str(command.workspace_id),
                    str(uuid4()),
                    str(uuid4()),
                    str(uuid4()),
                    "sha256:" + "f" * 64,
                    "sha256:" + "e" * 64,
                ),
            )
        service = GraphSnapshotService(manager)
        with pytest.raises(InvalidArgumentError, match="stale"):
            await service.publish(
                command.workspace_id, projection_id=projection.projection_id
            )
    finally:
        await manager.close()

    manager = DBManager()
    try:
        command, projection = await _prepare_graph(manager)
        service = GraphSnapshotService(manager)

        def fail(boundary: str) -> None:
            if boundary == "snapshot_staged":
                raise RuntimeError("injected graph snapshot failure")

        monkeypatch.setattr(service, "_after_write_boundary", fail)
        with pytest.raises(RuntimeError, match="injected graph snapshot failure"):
            await service.publish(
                command.workspace_id, projection_id=projection.projection_id
            )
    finally:
        await manager.close()
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT count(*) FROM graph_snapshots WHERE workspace_id = %s",
            (str(command.workspace_id),),
        )
        assert cursor.fetchone() == (0,)


@pytest.mark.asyncio
async def test_revision_invalidation_hides_graph_and_failure_keeps_base_visible() -> None:
    manager = DBManager()
    try:
        command, projection = await _prepare_graph(manager)
        service = GraphSnapshotService(manager)
        await service.publish(
            command.workspace_id, projection_id=projection.projection_id
        )
        await service.mark_failed(
            command.workspace_id, reason="graph provider unavailable"
        )
    finally:
        await manager.close()

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT state, base_readiness, graph_readiness
                 FROM document_revisions
                WHERE workspace_id = %s AND revision_id = %s""",
            (str(command.workspace_id), str(command.revision_id)),
        )
        assert cursor.fetchone() == ("searchable", "ready", "failed")
        cursor.execute(
            "SELECT count(*) FROM current_chunks WHERE workspace_id = %s",
            (str(command.workspace_id),),
        )
        assert cursor.fetchone() == (1,)
        cursor.execute(
            """UPDATE document_revisions SET state = 'tombstoned'
                WHERE workspace_id = %s AND revision_id = %s""",
            (str(command.workspace_id), str(command.revision_id)),
        )
        cursor.execute(
            """SELECT
                 (SELECT count(*) FROM current_graph_snapshots
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM current_canonical_relationships
                   WHERE workspace_id = %s),
                 (SELECT count(*) FROM graph_snapshots
                   WHERE workspace_id = %s AND status = 'historical'),
                 (SELECT count(*) FROM current_chunks WHERE workspace_id = %s)""",
            (str(command.workspace_id),) * 4,
        )
        assert cursor.fetchone() == (0, 0, 1, 0)


@pytest.mark.asyncio
async def test_canonical_query_repository_returns_only_current_cited_graph() -> None:
    manager = DBManager()
    try:
        command, projection = await _prepare_graph(manager)
        await GraphSnapshotService(manager).publish(
            command.workspace_id, projection_id=projection.projection_id
        )
        with _connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE chunks SET embedding = %s::vector
                    WHERE workspace_id = %s AND chunk_id = %s""",
                (
                    str([0.125] * 1024),
                    str(command.workspace_id),
                    command.chunk_id,
                ),
            )

        async def embed(_query: str) -> np.ndarray:
            return np.array([0.125] * 1024, dtype="float32")

        repository = CanonicalQueryRepository(
            manager,
            AuthorizationContext(
                workspace_id=command.workspace_id,
                subject_id="reader-1",
                authorization_version="test-v1",
            ),
            embed,
        )
        result = await KnowledgeQueryService(repository).search(
            MemoryQueryRequest(query="Which library does Atlas Edge use?")
        )
        explanation = await repository.resolve_assertion(
            str(projection.relationships[0].assertion_ids[0])
        )
        with _connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE chunks
                      SET acl_scope = 'restricted',
                          acl_principal_ids = '["reader-1"]'::jsonb
                    WHERE workspace_id = %s AND chunk_id = %s""",
                (str(command.workspace_id), command.chunk_id),
            )
        denied_repository = CanonicalQueryRepository(
            manager,
            AuthorizationContext(
                workspace_id=command.workspace_id,
                subject_id="not-authorized",
                authorization_version="test-v1",
            ),
            embed,
        )
        denied = await KnowledgeQueryService(denied_repository).search(
            MemoryQueryRequest(query="Reveal Atlas evidence")
        )
    finally:
        await manager.close()

    assert result.text_hits[0].chunk_id == command.chunk_id
    assert result.graph_paths[0].hops[0].predicate == "uses"
    assert result.graph_paths[0].hops[0].citations
    assert explanation.excerpt == CHUNK_TEXT
    assert denied.text_hits == ()
    assert denied.graph_paths == ()
