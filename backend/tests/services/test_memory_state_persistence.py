from datetime import UTC, datetime
from uuid import uuid4

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.rag_db import DBManager
from app.schemas.agent_memory import SectionLocation
from app.schemas.memory_state import MemoryStateProjection
from app.services.memory_state_repository import MemoryStateRepository


def _connect():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def _seed_current_graph(workspace_id, revision_id, graph_snapshot_id) -> None:
    source_id = uuid4()
    document_id = uuid4()
    resolution_run_id = uuid4()
    graph_projection_id = uuid4()
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO document_revisions (
                 workspace_id, revision_id, source_id, document_id,
                 source_external_id, source_version_key, content_checksum,
                 acl_checksum, state, base_readiness, graph_readiness,
                 discovery_readiness, acl_scope, acl_principal_ids
               ) VALUES (
                 %s, %s, %s, %s, %s, 'v1', %s, %s, 'searchable',
                 'ready', 'ready', 'ready', 'workspace', '[]'::jsonb)""",
            (
                str(workspace_id),
                str(revision_id),
                str(source_id),
                str(document_id),
                str(document_id),
                "sha256:" + "a" * 64,
                "sha256:" + "b" * 64,
            ),
        )
        cursor.execute(
            """INSERT INTO entity_resolution_runs (
                 workspace_id, resolution_run_id, resolver_version,
                 evidence_checksum, mapping_checksum, status
               ) VALUES (%s, %s, 'resolver-v1', %s, %s, 'complete')""",
            (
                str(workspace_id),
                str(resolution_run_id),
                "sha256:" + "c" * 64,
                "sha256:" + "d" * 64,
            ),
        )
        cursor.execute(
            """INSERT INTO relationship_projection_versions (
                 workspace_id, projection_id, resolution_run_id,
                 projection_version, evidence_checksum, revision_set_checksum,
                 projection_checksum, status
               ) VALUES (%s, %s, %s, 'graph-v1', %s, %s, %s, 'complete')""",
            (
                str(workspace_id),
                str(graph_projection_id),
                str(resolution_run_id),
                "sha256:" + "e" * 64,
                "sha256:" + "f" * 64,
                "sha256:" + "1" * 64,
            ),
        )
        cursor.execute(
            """INSERT INTO graph_snapshots (
                 workspace_id, snapshot_id, projection_id, resolution_run_id,
                 revision_set_checksum, graph_checksum, status, published_at
               ) VALUES (%s, %s, %s, %s, %s, %s, 'current', now())""",
            (
                str(workspace_id),
                str(graph_snapshot_id),
                str(graph_projection_id),
                str(resolution_run_id),
                "sha256:" + "f" * 64,
                "sha256:" + "2" * 64,
            ),
        )
        cursor.execute(
            """INSERT INTO graph_snapshot_revisions (
                 workspace_id, snapshot_id, revision_id,
                 content_checksum, acl_checksum
               ) VALUES (%s, %s, %s, %s, %s)""",
            (
                str(workspace_id),
                str(graph_snapshot_id),
                str(revision_id),
                "sha256:" + "a" * 64,
                "sha256:" + "b" * 64,
            ),
        )


def test_assertion_row_mapper_keeps_only_typed_fields_and_canonical_location_kind() -> None:
    assertion_id = uuid4()
    revision_id = uuid4()
    row = {
        "assertion_id": assertion_id,
        "revision_id": revision_id,
        "chunk_id": "chunk-1",
        "subject_entity_id": uuid4(),
        "predicate": "has_status",
        "object_entity_id": None,
        "object_value": "healthy",
        "polarity": "affirmed",
        "confidence": 0.9,
        "valid_from": None,
        "valid_to": None,
        "revision_order": 0,
        "is_current": True,
        "evidence_start": 0,
        "evidence_end": 7,
        "workspace_id": uuid4(),
        "source_id": uuid4(),
        "document_id": uuid4(),
        "source_name": "Status page",
        "source_type": "notion",
        "location_kind": "section",
        "location_data": {"kind": "page", "heading_path": ["Health"]},
        "source_modified_at": datetime(2026, 7, 31, tzinfo=UTC),
        "ingested_at": datetime(2026, 7, 31, tzinfo=UTC),
        "content_hash": "sha256:" + "a" * 64,
    }

    assertion = MemoryStateRepository._assertion(row)

    assert assertion.assertion_id == assertion_id
    assert isinstance(assertion.citation.provenance.location, SectionLocation)


@pytest.mark.asyncio
async def test_retry_is_idempotent_and_supersede_invalidates_current_projection() -> None:
    workspace_id = uuid4()
    revision_id = uuid4()
    graph_snapshot_id = uuid4()
    _seed_current_graph(workspace_id, revision_id, graph_snapshot_id)
    projection = MemoryStateProjection(
        projection_id=uuid4(),
        workspace_id=workspace_id,
        graph_snapshot_id=graph_snapshot_id,
        revision_set_checksum="sha256:" + "f" * 64,
        projection_version="memory-state-v1",
        projection_checksum="sha256:" + "3" * 64,
        inspected_at=datetime(2026, 7, 31, tzinfo=UTC),
    )
    manager = DBManager()
    repository = MemoryStateRepository(manager)
    try:
        assert await repository.publish_atomic(projection) == projection
        assert await repository.publish_atomic(projection) == projection
    finally:
        await manager.close()

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT count(*), min(status)
                 FROM memory_state_projections
                WHERE workspace_id = %s""",
            (str(workspace_id),),
        )
        assert cursor.fetchone() == (1, "current")
        cursor.execute(
            """UPDATE document_revisions SET state = 'superseded'
                WHERE workspace_id = %s AND revision_id = %s""",
            (str(workspace_id), str(revision_id)),
        )
        cursor.execute(
            """SELECT status FROM graph_snapshots
                WHERE workspace_id = %s AND snapshot_id = %s""",
            (str(workspace_id), str(graph_snapshot_id)),
        )
        assert cursor.fetchone() == ("historical",)
        cursor.execute(
            """SELECT count(*), min(status)
                 FROM memory_state_projections
                WHERE workspace_id = %s""",
            (str(workspace_id),),
        )
        assert cursor.fetchone() == (1, "historical")
