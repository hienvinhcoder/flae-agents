from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
import psycopg2
from psycopg2 import sql
from sqlalchemy.engine import make_url

from app.core.config import settings


BACKEND_ROOT = Path(__file__).parents[2]


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def test_rag_database_is_upgraded_to_head_with_base_tables() -> None:
    # After rag_0023 drops unused tables and partitions everything by workspace,
    # only the active core tables remain.  Dropped tables include the old
    # evidence, entity-resolution, graph-snapshot, topic-discovery, memory-state,
    # and semantic-projection tables.
    expected_tables = {
        "chunks",
        "entities",
        "relationships",
        "topics",
        "topic_memberships",
        "topic_aliases",
        "document_revisions",
        "document_sections",
        "ingestion_runs",
        "stage_manifests",
        "staged_base_chunks",
        "knowledge_domains",
    }

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT version_num FROM alembic_version")
        version = cursor.fetchone()
        cursor.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        tables = {row[0] for row in cursor.fetchall()}

    assert version is not None
    assert expected_tables <= tables


def test_disposable_database_clean_install_and_legacy_upgrade(
    monkeypatch,
) -> None:
    base_url = make_url(settings.RAG_DATABASE_URL)
    database_name = "rag_smoke_" + uuid4().hex
    admin = psycopg2.connect(
        dbname="postgres",
        user=base_url.username,
        password=base_url.password,
        host=base_url.host,
        port=base_url.port,
    )
    admin.autocommit = True
    try:
        with admin.cursor() as cursor:
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )

        disposable_url = base_url.set(database=database_name).render_as_string(
            hide_password=False
        )
        monkeypatch.setattr(settings, "RAG_DATABASE_URL", disposable_url)
        alembic_config = Config(str(BACKEND_ROOT / "alembic-rag.ini"))
        command.upgrade(alembic_config, "rag_0001")

        database = psycopg2.connect(
            dbname=database_name,
            user=base_url.username,
            password=base_url.password,
            host=base_url.host,
            port=base_url.port,
        )
        with database, database.cursor() as cursor:
            cursor.execute(
                """INSERT INTO chunks (
                       workspace_id, chunk_id, text, source_document_id
                   ) VALUES (%s, 'legacy-chunk', 'legacy evidence', %s)""",
                (str(uuid4()), str(uuid4())),
            )
        database.close()

        command.upgrade(alembic_config, "head")
        expected_head = ScriptDirectory.from_config(alembic_config).get_current_head()
        database = psycopg2.connect(
            dbname=database_name,
            user=base_url.username,
            password=base_url.password,
            host=base_url.host,
            port=base_url.port,
        )
        with database, database.cursor() as cursor:
            cursor.execute("SELECT version_num FROM alembic_version")
            assert cursor.fetchone() == (expected_head,)
            cursor.execute(
                """SELECT state, base_readiness, is_synthetic
                   FROM document_revisions"""
            )
            assert cursor.fetchone() == ("searchable", "ready", True)
            cursor.execute("SELECT chunk_id FROM current_chunks")
            assert cursor.fetchone() == ("legacy-chunk",)
            cursor.execute(
                """SELECT column_name FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'knowledge_domains'
                      AND column_name = 'domain_id'"""
            )
            assert cursor.fetchone() == ("domain_id",)
        database.close()
    finally:
        with admin.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = %s",
                (database_name,),
            )
            cursor.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(database_name)
                )
            )
        admin.close()
