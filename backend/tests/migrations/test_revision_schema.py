from uuid import uuid4

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def test_revision_run_and_manifest_idempotency_constraints() -> None:
    workspace_id = str(uuid4())
    source_id = str(uuid4())
    document_id = str(uuid4())
    revision_id = str(uuid4())
    run_id = str(uuid4())

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        revision_values = (
            workspace_id,
            revision_id,
            source_id,
            document_id,
            "doc-external-1",
            "source-revision-7",
            "sha256:" + "a" * 64,
            "sha256:" + "b" * 64,
        )
        for _ in range(2):
            cursor.execute(
                """
                INSERT INTO document_revisions (
                    workspace_id, revision_id, source_id, document_id,
                    source_external_id, source_version_key, content_checksum,
                    acl_checksum, acl_scope, acl_principal_ids,
                    state, base_readiness, graph_readiness,
                    discovery_readiness
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                          'workspace', '[]'::jsonb,
                          'staging', 'pending', 'pending', 'pending')
                ON CONFLICT (
                    workspace_id, source_id, source_external_id, source_version_key
                ) DO NOTHING
                """,
                revision_values,
            )

        for _ in range(2):
            cursor.execute(
                """
                INSERT INTO ingestion_runs (
                    workspace_id, run_id, revision_id, pipeline_version,
                    input_checksum, status
                ) VALUES (%s, %s, %s, 'pipeline-v2', %s, 'pending')
                ON CONFLICT (
                    workspace_id, revision_id, pipeline_version, input_checksum
                ) DO NOTHING
                """,
                (workspace_id, run_id, revision_id, "sha256:" + "c" * 64),
            )

        for _ in range(2):
            cursor.execute(
                """
                INSERT INTO stage_manifests (
                    workspace_id, manifest_id, ingestion_run_id, stage_name,
                    batch_id, pipeline_version, input_checksum, output_checksum,
                    item_count
                ) VALUES (%s, %s, %s, 'parse', 'batch-1', 'pipeline-v2',
                          %s, %s, 12)
                ON CONFLICT (
                    workspace_id, ingestion_run_id, stage_name, batch_id,
                    pipeline_version
                ) DO NOTHING
                """,
                (
                    workspace_id,
                    str(uuid4()),
                    run_id,
                    "sha256:" + "d" * 64,
                    "sha256:" + "e" * 64,
                ),
            )

        cursor.execute(
            "SELECT count(*) FROM document_revisions WHERE workspace_id = %s",
            (workspace_id,),
        )
        assert cursor.fetchone() == (1,)
        cursor.execute(
            "SELECT count(*) FROM ingestion_runs WHERE workspace_id = %s",
            (workspace_id,),
        )
        assert cursor.fetchone() == (1,)
        cursor.execute(
            """SELECT count(*), min(output_checksum), min(item_count)
               FROM stage_manifests WHERE workspace_id = %s""",
            (workspace_id,),
        )
        assert cursor.fetchone() == (1, "sha256:" + "e" * 64, 12)


def test_searchable_revision_requires_ready_base() -> None:
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        with pytest.raises(psycopg2.errors.CheckViolation):
            cursor.execute(
                """
                INSERT INTO document_revisions (
                    workspace_id, revision_id, source_id, document_id,
                    source_external_id, source_version_key, content_checksum,
                    acl_checksum, acl_scope, acl_principal_ids,
                    state, base_readiness, graph_readiness,
                    discovery_readiness
                ) VALUES (%s, %s, %s, %s, 'doc', 'v1', %s, %s,
                          'workspace', '[]'::jsonb,
                          'searchable', 'pending', 'pending', 'pending')
                """,
                (
                    str(uuid4()),
                    str(uuid4()),
                    str(uuid4()),
                    str(uuid4()),
                    "sha256:" + "a" * 64,
                    "sha256:" + "b" * 64,
                ),
            )
