"""add evidence-backed memory-state projections

Revision ID: rag_0016
Revises: rag_0015
Create Date: 2026-07-31
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0016"
down_revision: str | Sequence[str] | None = "rag_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = ("memory_state_rules", "memory_state_projections")


def upgrade() -> None:
    op.create_table(
        "memory_state_rules",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "subject_entity_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("predicate", sa.Text(), nullable=False),
        sa.Column("required_polarities", postgresql.JSONB(), nullable=False),
        sa.Column(
            "minimum_confidence",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("stale_after_seconds", sa.Integer(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("workspace_id", "rule_id"),
        sa.CheckConstraint(
            "minimum_confidence >= 0 AND minimum_confidence <= 1",
            name="ck_memory_state_rules_confidence",
        ),
        sa.CheckConstraint(
            "stale_after_seconds IS NULL OR stale_after_seconds > 0",
            name="ck_memory_state_rules_staleness",
        ),
    )
    op.create_table(
        "memory_state_projections",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "graph_snapshot_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("revision_set_checksum", sa.Text(), nullable=False),
        sa.Column("projection_version", sa.Text(), nullable=False),
        sa.Column("projection_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("inspected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("change_count", sa.Integer(), nullable=False),
        sa.Column("contradiction_count", sa.Integer(), nullable=False),
        sa.Column("gap_count", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("workspace_id", "projection_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "graph_snapshot_id"),
            ("graph_snapshots.workspace_id", "graph_snapshots.snapshot_id"),
        ),
        sa.CheckConstraint(
            "status IN ('staging', 'current', 'historical')",
            name="ck_memory_state_projections_status",
        ),
        sa.CheckConstraint(
            "change_count >= 0 AND contradiction_count >= 0 AND gap_count >= 0",
            name="ck_memory_state_projections_counts",
        ),
    )
    op.create_index(
        "uq_memory_state_projections_current_workspace",
        "memory_state_projections",
        ("workspace_id",),
        unique=True,
        postgresql_where=sa.text("status = 'current'"),
    )
    _secure_tables()
    _create_invalidation_trigger()


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_invalidate_memory_state_projection "
        "ON public.graph_snapshots"
    )
    op.execute("DROP FUNCTION IF EXISTS public.invalidate_memory_state_projection()")
    op.drop_index(
        "uq_memory_state_projections_current_workspace",
        table_name="memory_state_projections",
    )
    op.drop_table("memory_state_projections")
    op.drop_table("memory_state_rules")


def _secure_tables() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
        for role in (APP_ROLE, INGESTION_ROLE):
            op.execute(
                f"CREATE POLICY {table}_{role}_workspace ON public.{table} "
                f"FOR ALL TO {role} "
                "USING (workspace_id = "
                "current_setting('app.current_workspace_id', true)) "
                "WITH CHECK (workspace_id = "
                "current_setting('app.current_workspace_id', true))"
            )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_state_rules "
        f"TO {INGESTION_ROLE}"
    )
    op.execute(
        "GRANT SELECT, INSERT ON public.memory_state_projections "
        f"TO {INGESTION_ROLE}"
    )
    op.execute(
        "GRANT UPDATE (status, published_at) ON public.memory_state_projections "
        f"TO {INGESTION_ROLE}"
    )


def _create_invalidation_trigger() -> None:
    op.execute(
        """CREATE FUNCTION public.invalidate_memory_state_projection()
           RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
           SET search_path = pg_catalog, public AS $$
           BEGIN
             IF OLD.status = 'current' AND NEW.status <> 'current' THEN
               UPDATE public.memory_state_projections
                  SET status = 'historical'
                WHERE workspace_id = OLD.workspace_id
                  AND graph_snapshot_id = OLD.snapshot_id
                  AND status = 'current';
             END IF;
             RETURN NULL;
           END $$"""
    )
    op.execute(
        """CREATE TRIGGER trg_invalidate_memory_state_projection
           AFTER UPDATE OF status ON public.graph_snapshots
           FOR EACH ROW EXECUTE FUNCTION public.invalidate_memory_state_projection()"""
    )
