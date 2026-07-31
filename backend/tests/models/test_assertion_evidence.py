from uuid import UUID, uuid4

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


def _seed_chunk(cursor) -> tuple[str, UUID, str]:
    workspace_id = str(uuid4())
    revision_id = uuid4()
    source_id = uuid4()
    document_id = uuid4()
    chunk_id = "chk_" + uuid4().hex
    cursor.execute(
        """
        INSERT INTO document_revisions (
            workspace_id, revision_id, source_id, document_id,
            source_external_id, source_version_key, content_checksum,
            acl_checksum, state, base_readiness, graph_readiness,
            discovery_readiness, acl_scope, acl_principal_ids
        ) VALUES (%s, %s, %s, %s, %s, 'v1', %s, %s,
                  'searchable', 'ready', 'pending', 'pending',
                  'workspace', '[]'::jsonb)
        """,
        (
            workspace_id,
            str(revision_id),
            str(source_id),
            str(document_id),
            str(document_id),
            "sha256:" + "a" * 64,
            "sha256:" + "b" * 64,
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
        ) VALUES (%s, %s, 'Nova was approved for production.', %s, %s, %s, %s,
                  '[]'::jsonb, 'section',
                  '{"heading_path":["Decision"]}'::jsonb, %s,
                  'parser-v2', 'chunker-v2', 'pipeline-v2', 'ADR', 'github',
                  now(), now(), 'workspace', '[]'::jsonb)
        """,
        (
            workspace_id,
            chunk_id,
            str(document_id),
            str(revision_id),
            str(source_id),
            str(document_id),
            "sha256:" + "c" * 64,
        ),
    )
    return workspace_id, revision_id, chunk_id


def _insert_observation(
    cursor, workspace_id: str, revision_id: UUID, chunk_id: str, mention: str
) -> UUID:
    observation_id = uuid4()
    cursor.execute(
        """
        INSERT INTO entity_observations (
            workspace_id, observation_id, revision_id, chunk_id, raw_mention,
            normalized_mention, proposed_type, evidence_start, evidence_end,
            extractor_version, confidence, evidence_key
        ) VALUES (%s, %s, %s, %s, %s, lower(%s), 'organization', 0, 4,
                  'extractor-v2', 0.9, %s)
        """,
        (
            workspace_id,
            str(observation_id),
            str(revision_id),
            chunk_id,
            mention,
            mention,
            "sha256:" + observation_id.hex * 2,
        ),
    )
    return observation_id


def test_assertions_preserve_predicate_and_retry_identity() -> None:
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        workspace_id, revision_id, chunk_id = _seed_chunk(cursor)
        subject_id = _insert_observation(
            cursor, workspace_id, revision_id, chunk_id, "ADR7"
        )
        object_id = _insert_observation(
            cursor, workspace_id, revision_id, chunk_id, "Nova"
        )

        for predicate in ("selects", "approved_for"):
            evidence_key = "sha256:" + ("d" if predicate == "selects" else "e") * 64
            for _ in range(2):
                cursor.execute(
                    """
                    INSERT INTO assertion_evidence (
                        workspace_id, assertion_id, revision_id, chunk_id,
                        subject_observation_id, predicate, object_observation_id,
                        polarity, confidence, evidence_start, evidence_end,
                        extractor_version, evidence_key
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s,
                              'affirmed', 0.95, 0, 20, 'extractor-v2', %s)
                    ON CONFLICT (workspace_id, revision_id, evidence_key) DO NOTHING
                    """,
                    (
                        workspace_id,
                        str(uuid4()),
                        str(revision_id),
                        chunk_id,
                        str(subject_id),
                        predicate,
                        str(object_id),
                        evidence_key,
                    ),
                )

        cursor.execute(
            """SELECT predicate, count(*) FROM assertion_evidence
               WHERE workspace_id = %s GROUP BY predicate ORDER BY predicate""",
            (workspace_id,),
        )
        assert cursor.fetchall() == [("approved_for", 1), ("selects", 1)]


def test_assertion_constraints_cover_literal_negation_uncertainty_and_time() -> None:
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        workspace_id, revision_id, chunk_id = _seed_chunk(cursor)
        subject_id = _insert_observation(
            cursor, workspace_id, revision_id, chunk_id, "ADR7"
        )
        base_values = (
            workspace_id,
            str(uuid4()),
            str(revision_id),
            chunk_id,
            str(subject_id),
            "sha256:" + "f" * 64,
        )
        cursor.execute(
            """
            INSERT INTO assertion_evidence (
                workspace_id, assertion_id, revision_id, chunk_id,
                subject_observation_id, predicate, object_value, polarity,
                confidence, valid_from, valid_to, evidence_start, evidence_end,
                extractor_version, evidence_key
            ) VALUES (%s, %s, %s, %s, %s, 'expires_at', '2026-12-31',
                      'uncertain', 0.6, '2026-01-01', '2027-01-01',
                      0, 20, 'extractor-v2', %s)
            """,
            base_values,
        )

        for invalid_sql in (
            """INSERT INTO assertion_evidence (
                   workspace_id, assertion_id, revision_id, chunk_id,
                   subject_observation_id, predicate, polarity, confidence,
                   evidence_start, evidence_end, extractor_version, evidence_key
               ) VALUES (%s, %s, %s, %s, %s, 'missing_object', 'negated', 0.8,
                         0, 5, 'extractor-v2', %s)""",
            """INSERT INTO assertion_evidence (
                   workspace_id, assertion_id, revision_id, chunk_id,
                   subject_observation_id, predicate, object_value, polarity,
                   confidence, evidence_start, evidence_end, extractor_version,
                   evidence_key
               ) VALUES (%s, %s, %s, %s, %s, 'bad_span', 'value', 'affirmed',
                         0.8, 5, 5, 'extractor-v2', %s)""",
        ):
            with connection.cursor() as invalid_cursor:
                invalid_cursor.execute("SAVEPOINT invalid_assertion")
                with pytest.raises(psycopg2.errors.CheckViolation):
                    invalid_cursor.execute(invalid_sql, base_values)
                invalid_cursor.execute("ROLLBACK TO SAVEPOINT invalid_assertion")
