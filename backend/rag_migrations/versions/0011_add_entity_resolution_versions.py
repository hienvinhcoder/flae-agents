"""add versioned and reversible entity resolution projections

Revision ID: rag_0011
Revises: rag_0010
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0011"
down_revision: str | Sequence[str] | None = "rag_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = (
    "entity_resolution_runs",
    "canonical_entity_versions",
    "entity_resolution_assignments",
    "entity_resolution_lineage",
)


def upgrade() -> None:
    op.create_table(
        "entity_resolution_runs",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resolver_version", sa.Text(), nullable=False),
        sa.Column("evidence_checksum", sa.Text(), nullable=False),
        sa.Column("mapping_checksum", sa.Text(), nullable=False),
        sa.Column("predecessor_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("workspace_id", "resolution_run_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "predecessor_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "resolver_version",
            "evidence_checksum",
            name="uq_entity_resolution_replay",
        ),
        sa.CheckConstraint("status = 'complete'", name="ck_entity_resolution_complete"),
    )
    op.create_table(
        "canonical_entity_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("canonical_entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("canonical_name", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("aliases", postgresql.JSONB(), nullable=False),
        sa.Column("external_ids", postgresql.JSONB(), nullable=False),
        sa.Column("disambiguation_attributes", postgresql.JSONB(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint(
            "workspace_id", "resolution_run_id", "canonical_entity_id"
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_canonical_entity_versions_confidence",
        ),
    )
    op.create_table(
        "entity_resolution_assignments",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("observation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("canonical_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("decision", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "resolution_run_id", "observation_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "observation_id"),
            ("entity_observations.workspace_id", "entity_observations.observation_id"),
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id", "canonical_entity_id"),
            (
                "canonical_entity_versions.workspace_id",
                "canonical_entity_versions.resolution_run_id",
                "canonical_entity_versions.canonical_entity_id",
            ),
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_entity_resolution_assignments_confidence",
        ),
        sa.CheckConstraint(
            "decision IN ('created', 'matched', 'unresolved')",
            name="ck_entity_resolution_assignments_decision",
        ),
        sa.CheckConstraint(
            "(decision = 'unresolved') = (canonical_entity_id IS NULL)",
            name="ck_entity_resolution_assignments_target",
        ),
    )
    op.create_table(
        "entity_resolution_lineage",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lineage_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("predecessor_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("from_entity_ids", postgresql.JSONB(), nullable=False),
        sa.Column("to_entity_ids", postgresql.JSONB(), nullable=False),
        sa.Column("observation_ids", postgresql.JSONB(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "resolution_run_id", "lineage_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "event_type IN ('created', 'unchanged', 'merged', 'split')",
            name="ck_entity_resolution_lineage_event",
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


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_table(table)
