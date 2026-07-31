from uuid import uuid4

import psycopg2
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


def test_current_chunks_hide_superseded_revision_evidence() -> None:
    workspace_id = str(uuid4())
    source_id = str(uuid4())
    document_id = str(uuid4())
    revision_id = str(uuid4())
    section_id = str(uuid4())
    chunk_id = "chk_provenance_test"

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO document_revisions (
                workspace_id, revision_id, source_id, document_id,
                source_external_id, source_version_key, content_checksum,
                acl_checksum, state, base_readiness, graph_readiness,
                discovery_readiness, acl_scope, acl_principal_ids
            ) VALUES (%s, %s, %s, %s, 'doc-1', 'v1', %s, %s,
                      'searchable', 'ready', 'pending', 'pending',
                      'restricted', '["user-1"]'::jsonb)
            """,
            (
                workspace_id,
                revision_id,
                source_id,
                document_id,
                "sha256:" + "a" * 64,
                "sha256:" + "b" * 64,
            ),
        )
        cursor.execute(
            """
            INSERT INTO document_sections (
                workspace_id, revision_id, section_id, heading_path,
                structural_key, ordinal, content_hash
            ) VALUES (%s, %s, %s, '["Architecture"]'::jsonb,
                      'architecture', 1, %s)
            """,
            (workspace_id, revision_id, section_id, "sha256:" + "c" * 64),
        )
        cursor.execute(
            """
            INSERT INTO chunks (
                workspace_id, chunk_id, text, source_document_id,
                revision_id, source_id, document_id, section_id, heading_path,
                location_kind, location_data, content_hash, parser_version,
                chunker_version, pipeline_version, source_name, source_type,
                source_modified_at, ingested_at, acl_scope, acl_principal_ids
            ) VALUES (
                %s, %s, 'Evidence text', %s, %s, %s, %s, %s,
                '["Architecture"]'::jsonb, 'code',
                '{"path":"docs/adr.md","start_line":1,"end_line":2}'::jsonb,
                %s, 'parser-v2', 'chunker-v2', 'pipeline-v2',
                'Architecture repository', 'github', now(), now(),
                'restricted', '["user-1"]'::jsonb
            )
            """,
            (
                workspace_id,
                chunk_id,
                document_id,
                revision_id,
                source_id,
                document_id,
                section_id,
                "sha256:" + "d" * 64,
            ),
        )

        cursor.execute(
            "SELECT chunk_id, revision_id FROM current_chunks WHERE workspace_id = %s",
            (workspace_id,),
        )
        assert cursor.fetchone() == (chunk_id, revision_id)

        cursor.execute(
            """UPDATE document_revisions
               SET state = 'superseded', updated_at = now()
               WHERE workspace_id = %s AND revision_id = %s""",
            (workspace_id, revision_id),
        )
        cursor.execute(
            "SELECT count(*) FROM current_chunks WHERE workspace_id = %s",
            (workspace_id,),
        )
        assert cursor.fetchone() == (0,)
