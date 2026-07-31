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


def _insert_restricted_chunk(
    cursor, *, workspace_id: str, subject_id: str, chunk_id: str
) -> None:
    revision_id = str(uuid4())
    source_id = str(uuid4())
    document_id = str(uuid4())
    cursor.execute(
        """
        INSERT INTO document_revisions (
            workspace_id, revision_id, source_id, document_id,
            source_external_id, source_version_key, content_checksum,
            acl_checksum, state, base_readiness, graph_readiness,
            discovery_readiness, acl_scope, acl_principal_ids
        ) VALUES (%s, %s, %s, %s, %s, 'v1', %s, %s,
                  'searchable', 'ready', 'pending', 'pending',
                  'restricted', %s::jsonb)
        """,
        (
            workspace_id,
            revision_id,
            source_id,
            document_id,
            document_id,
            "sha256:" + "a" * 64,
            "sha256:" + "b" * 64,
            f'["{subject_id}"]',
        ),
    )
    cursor.execute(
        """
        INSERT INTO chunks (
            workspace_id, chunk_id, text, source_document_id,
            revision_id, source_id, document_id, heading_path, location_kind,
            location_data, content_hash, parser_version, chunker_version,
            pipeline_version, source_name, source_type, source_modified_at,
            ingested_at, acl_scope, acl_principal_ids
        ) VALUES (%s, %s, 'restricted evidence', %s, %s, %s, %s,
                  '[]'::jsonb, 'section',
                  '{"heading_path":["Restricted"]}'::jsonb, %s,
                  'parser-v2', 'chunker-v2', 'pipeline-v2', 'Restricted source',
                  'github', now(), now(), 'restricted', %s::jsonb)
        """,
        (
            workspace_id,
            chunk_id,
            document_id,
            revision_id,
            source_id,
            document_id,
            "sha256:" + "c" * 64,
            f'["{subject_id}"]',
        ),
    )


def _set_authorization_context(cursor, workspace_id: str, subject_id: str) -> None:
    cursor.execute("SET ROLE flae_rag_app")
    cursor.execute(
        "SELECT set_config('app.current_workspace_id', %s, false)",
        (workspace_id,),
    )
    cursor.execute(
        "SELECT set_config('app.current_subject_id', %s, false)",
        (subject_id,),
    )


def test_rls_filters_workspace_and_source_acl_before_current_chunk_candidates() -> None:
    workspace_a = str(uuid4())
    workspace_b = str(uuid4())
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        _insert_restricted_chunk(
            cursor,
            workspace_id=workspace_a,
            subject_id="user-a",
            chunk_id="chunk-a",
        )
        _insert_restricted_chunk(
            cursor,
            workspace_id=workspace_b,
            subject_id="user-b",
            chunk_id="chunk-b",
        )

    with _connect_to_rag_test_database() as authorized, authorized.cursor() as cursor:
        _set_authorization_context(cursor, workspace_a, "user-a")
        cursor.execute("SELECT chunk_id FROM current_chunks ORDER BY chunk_id")
        assert cursor.fetchall() == [("chunk-a",)]

    with _connect_to_rag_test_database() as wrong_subject, wrong_subject.cursor() as cursor:
        _set_authorization_context(cursor, workspace_a, "user-b")
        cursor.execute("SELECT count(*) FROM current_chunks")
        assert cursor.fetchone() == (0,)


def test_missing_workspace_context_is_default_deny() -> None:
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute("SET ROLE flae_rag_app")
        cursor.execute("SELECT count(*) FROM current_chunks")
        assert cursor.fetchone() == (0,)


def test_legacy_discovery_tables_are_fail_closed_until_evidence_acl_mapping_exists() -> None:
    workspace_id = str(uuid4())
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        cursor.execute(
            """INSERT INTO topics (
                   workspace_id, topic_id, name, slug, type, status
               ) VALUES (%s, %s, 'Private topic', %s, 'topic', 'active')""",
            (workspace_id, str(uuid4()), "private-" + uuid4().hex),
        )

    with _connect_to_rag_test_database() as reader, reader.cursor() as cursor:
        _set_authorization_context(cursor, workspace_id, "user-a")
        cursor.execute("SELECT count(*) FROM topics")
        assert cursor.fetchone() == (0,)


def test_rls_with_check_rejects_cross_workspace_writes() -> None:
    workspace_a = str(uuid4())
    workspace_b = str(uuid4())
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        _set_authorization_context(cursor, workspace_a, "user-a")
        with pytest.raises(psycopg2.errors.InsufficientPrivilege):
            cursor.execute(
                """INSERT INTO topics (
                       workspace_id, topic_id, name, slug, type, status
                   ) VALUES (%s, %s, 'Cross tenant', %s, 'topic', 'active')""",
                (workspace_b, str(uuid4()), "cross-" + uuid4().hex),
            )


def test_evidence_rows_inherit_chunk_acl_without_leaking_ids_or_counts() -> None:
    workspace_id = str(uuid4())
    observation_id = str(uuid4())
    assertion_id = str(uuid4())
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        _insert_restricted_chunk(
            cursor,
            workspace_id=workspace_id,
            subject_id="user-a",
            chunk_id="evidence-chunk-a",
        )
        cursor.execute(
            """SELECT revision_id FROM chunks
               WHERE workspace_id = %s AND chunk_id = 'evidence-chunk-a'""",
            (workspace_id,),
        )
        revision_id = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO entity_observations (
                workspace_id, observation_id, revision_id, chunk_id,
                raw_mention, normalized_mention, proposed_type,
                evidence_start, evidence_end, extractor_version, confidence,
                evidence_key
            ) VALUES (%s, %s, %s, 'evidence-chunk-a', 'Aurora', 'aurora',
                      'customer', 0, 6, 'extractor-v2', 0.9, %s)
            """,
            (
                workspace_id,
                observation_id,
                revision_id,
                "sha256:" + "d" * 64,
            ),
        )
        cursor.execute(
            """
            INSERT INTO assertion_evidence (
                workspace_id, assertion_id, revision_id, chunk_id,
                subject_observation_id, predicate, object_value, polarity,
                confidence, evidence_start, evidence_end, extractor_version,
                evidence_key
            ) VALUES (%s, %s, %s, 'evidence-chunk-a', %s, 'has_status',
                      'active', 'affirmed', 0.9, 0, 20, 'extractor-v2', %s)
            """,
            (
                workspace_id,
                assertion_id,
                revision_id,
                observation_id,
                "sha256:" + "e" * 64,
            ),
        )

    with _connect_to_rag_test_database() as allowed, allowed.cursor() as cursor:
        _set_authorization_context(cursor, workspace_id, "user-a")
        cursor.execute("SELECT observation_id FROM entity_observations")
        assert cursor.fetchall() == [(observation_id,)]
        cursor.execute("SELECT assertion_id FROM assertion_evidence")
        assert cursor.fetchall() == [(assertion_id,)]

    with _connect_to_rag_test_database() as denied, denied.cursor() as cursor:
        _set_authorization_context(cursor, workspace_id, "user-b")
        cursor.execute("SELECT count(*) FROM entity_observations")
        assert cursor.fetchone() == (0,)
        cursor.execute("SELECT count(*) FROM assertion_evidence")
        assert cursor.fetchone() == (0,)


def test_all_rag_tables_enable_and_force_rls() -> None:
    expected_tables = {
        "chunks",
        "entities",
        "relationships",
        "topics",
        "topic_memberships",
        "topic_aliases",
        "topic_update_queue",
        "document_revisions",
        "ingestion_runs",
        "stage_manifests",
        "document_sections",
        "entity_observations",
        "assertion_evidence",
        "assertion_qualifiers",
        "staged_base_chunks",
        "entity_resolution_runs",
        "canonical_entity_versions",
        "entity_resolution_assignments",
        "entity_resolution_lineage",
        "relationship_projection_versions",
        "canonical_relationship_versions",
        "graph_mappings",
        "graph_snapshots",
        "graph_snapshot_revisions",
        "memory_state_rules",
        "memory_state_projections",
    }
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT relname, relrowsecurity, relforcerowsecurity
               FROM pg_class
               WHERE relnamespace = 'public'::regnamespace
                 AND relname = ANY(%s)""",
            (list(expected_tables),),
        )
        rows = cursor.fetchall()

    assert {row[0] for row in rows} == expected_tables
    assert all(row[1] and row[2] for row in rows)


def test_ingestion_role_is_workspace_scoped_and_cannot_delete_evidence() -> None:
    workspace_a = str(uuid4())
    workspace_b = str(uuid4())
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        for workspace_id in (workspace_a, workspace_b):
            cursor.execute(
                """INSERT INTO document_revisions (
                     workspace_id, revision_id, source_id, document_id,
                     source_external_id, source_version_key, content_checksum,
                     acl_checksum, state, base_readiness, graph_readiness,
                     discovery_readiness, acl_scope, acl_principal_ids
                   ) VALUES (%s, %s, %s, %s, %s, 'v1', %s, %s,
                             'staging', 'pending', 'pending', 'pending',
                             'restricted', '["private-reader"]'::jsonb)""",
                (
                    workspace_id,
                    str(uuid4()),
                    str(uuid4()),
                    str(uuid4()),
                    "internal-" + workspace_id,
                    "sha256:" + "a" * 64,
                    "sha256:" + "b" * 64,
                ),
            )

    with _connect_to_rag_test_database() as worker, worker.cursor() as cursor:
        cursor.execute("SET ROLE flae_rag_ingestion")
        cursor.execute(
            "SELECT set_config('app.current_workspace_id', %s, false)",
            (workspace_a,),
        )
        cursor.execute("SELECT workspace_id FROM document_revisions")
        assert cursor.fetchall() == [(workspace_a,)]
        cursor.execute(
            """SELECT rolcanlogin, rolinherit, rolbypassrls
               FROM pg_roles WHERE rolname = 'flae_rag_ingestion'"""
        )
        assert cursor.fetchone() == (False, False, False)
        cursor.execute(
            """SELECT has_table_privilege(
                 'flae_rag_ingestion', 'public.chunks', 'DELETE'
               )"""
        )
        assert cursor.fetchone() == (False,)
        cursor.execute(
            """SELECT has_table_privilege(
                 'flae_rag_app', 'public.staged_base_chunks', 'SELECT'
               )"""
        )
        assert cursor.fetchone() == (False,)


def test_revision_evidence_identity_is_immutable_while_lifecycle_can_advance() -> None:
    workspace_id = str(uuid4())
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        _insert_restricted_chunk(
            cursor,
            workspace_id=workspace_id,
            subject_id="user-a",
            chunk_id="immutable-revision-chunk",
        )
        cursor.execute(
            """SELECT revision_id FROM document_revisions
               WHERE workspace_id = %s""",
            (workspace_id,),
        )
        revision_id = cursor.fetchone()[0]
        cursor.execute("SAVEPOINT immutable_revision")
        with pytest.raises(psycopg2.errors.RaiseException, match="immutable"):
            cursor.execute(
                """UPDATE document_revisions SET content_checksum = %s
                   WHERE workspace_id = %s AND revision_id = %s""",
                ("sha256:" + "f" * 64, workspace_id, revision_id),
            )
        cursor.execute("ROLLBACK TO SAVEPOINT immutable_revision")
        cursor.execute(
            """UPDATE document_revisions SET state = 'superseded'
               WHERE workspace_id = %s AND revision_id = %s""",
            (workspace_id, revision_id),
        )
        assert cursor.rowcount == 1
