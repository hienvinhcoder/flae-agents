"""add atomic discovery snapshots

Revision ID: rag_0015
Revises: rag_0014
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0015"
down_revision: str | Sequence[str] | None = "rag_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = ("discovery_snapshots", "discovery_snapshot_payloads")


def upgrade() -> None:
    op.create_table(
        "discovery_snapshots",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("graph_snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("context_discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_set_checksum", sa.Text(), nullable=False),
        sa.Column("discovery_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("topic_count", sa.Integer(), nullable=False),
        sa.Column("context_count", sa.Integer(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("workspace_id", "snapshot_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "graph_snapshot_id"),
            ("graph_snapshots.workspace_id", "graph_snapshots.snapshot_id"),
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "topic_discovery_run_id"),
            ("topic_discovery_runs.workspace_id", "topic_discovery_runs.discovery_run_id"),
        ),
        sa.CheckConstraint(
            "status IN ('staging', 'current', 'historical', 'failed')",
            name="ck_discovery_snapshots_status",
        ),
    )
    op.create_index(
        "uq_discovery_snapshots_current_workspace",
        "discovery_snapshots",
        ("workspace_id",),
        unique=True,
        postgresql_where=sa.text("status = 'current'"),
    )
    op.create_table(
        "discovery_snapshot_payloads",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_payload", postgresql.JSONB(), nullable=False),
        sa.Column("context_payload", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "snapshot_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "snapshot_id"),
            ("discovery_snapshots.workspace_id", "discovery_snapshots.snapshot_id"),
            ondelete="CASCADE",
        ),
    )
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
        for role in (APP_ROLE, INGESTION_ROLE):
            op.execute(
                f"CREATE POLICY {table}_{role}_workspace ON public.{table} "
                f"FOR ALL TO {role} "
                "USING (workspace_id = current_setting('app.current_workspace_id', true)) "
                "WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true))"
            )
        op.execute(f"GRANT SELECT ON public.{table} TO {APP_ROLE}")
        op.execute(f"GRANT SELECT, INSERT ON public.{table} TO {INGESTION_ROLE}")
    op.execute(
        f"GRANT UPDATE (status, failure_reason, published_at) "
        f"ON public.discovery_snapshots TO {INGESTION_ROLE}"
    )
    op.execute(
        """CREATE FUNCTION public.invalidate_discovery_snapshot()
           RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
           SET search_path = pg_catalog, public AS $$
           BEGIN
             IF OLD.status = 'current' AND NEW.status <> 'current' THEN
               UPDATE public.discovery_snapshots
                  SET status = 'historical'
                WHERE workspace_id = OLD.workspace_id
                  AND graph_snapshot_id = OLD.snapshot_id
                  AND status = 'current';
               UPDATE public.document_revisions
                  SET discovery_readiness = 'stale',
                      readiness_reason = 'discovery_snapshot_invalidated',
                      updated_at = now()
                WHERE workspace_id = OLD.workspace_id
                  AND state = 'searchable';
             END IF;
             RETURN NULL;
           END $$"""
    )
    op.execute(
        """CREATE TRIGGER trg_invalidate_discovery_snapshot
           AFTER UPDATE OF status ON public.graph_snapshots
           FOR EACH ROW EXECUTE FUNCTION public.invalidate_discovery_snapshot()"""
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_invalidate_discovery_snapshot "
        "ON public.graph_snapshots"
    )
    op.execute("DROP FUNCTION IF EXISTS public.invalidate_discovery_snapshot()")
    op.drop_table("discovery_snapshot_payloads")
    op.drop_index(
        "uq_discovery_snapshots_current_workspace",
        table_name="discovery_snapshots",
    )
    op.drop_table("discovery_snapshots")
