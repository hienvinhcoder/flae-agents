from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


BACKEND_ROOT = Path(__file__).parents[2]


def test_topic_discovery_schema_is_in_the_rag_migration_chain() -> None:
    config = Config(str(BACKEND_ROOT / "alembic-rag.ini"))
    revisions = {item.revision for item in ScriptDirectory.from_config(config).walk_revisions()}

    assert "rag_0014" in revisions


def test_topic_discovery_migration_defines_versioned_evidence_tables() -> None:
    migration = (
        BACKEND_ROOT
        / "rag_migrations"
        / "versions"
        / "0014_add_versioned_topic_discovery.py"
    ).read_text()

    for table in (
        "topic_discovery_runs",
        "topic_versions",
        "topic_membership_versions",
        "topic_membership_revision_evidence",
        "topic_lineage_events",
    ):
        assert f'"{table}"' in migration

    assert "ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY" in migration
    assert "ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY" in migration

    assert "uq_topic_discovery_replay" in migration
    assert "ck_topic_versions_active_evidence" in migration
    assert 'sa.Column("supporting_evidence_ids", postgresql.JSONB(), nullable=False)' in migration
    assert "document_revisions.workspace_id" in migration
    assert "graph_snapshots.workspace_id" in migration
