"""add rebuildable directed relationships and bidirectional graph mappings

Revision ID: rag_0012
Revises: rag_0011
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0012"
down_revision: str | Sequence[str] | None = "rag_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = (
    "relationship_projection_versions",
    "canonical_relationship_versions",
    "graph_mappings",
)


def upgrade() -> None:
    op.create_table(
        "relationship_projection_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("projection_version", sa.Text(), nullable=False),
        sa.Column("evidence_checksum", sa.Text(), nullable=False),
        sa.Column("projection_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("workspace_id", "projection_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
        ),
        sa.UniqueConstraint(
            "workspace_id", "resolution_run_id", "projection_version",
            "evidence_checksum", name="uq_relationship_projection_replay",
        ),
        sa.CheckConstraint("status = 'complete'", name="ck_relationship_projection_complete"),
    )
    op.create_table(
        "canonical_relationship_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("predicate", sa.Text(), nullable=False),
        sa.Column("object_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("object_value", sa.Text(), nullable=True),
        sa.Column("polarity", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("frequency", sa.Integer(), nullable=False),
        sa.Column("assertion_ids", postgresql.JSONB(), nullable=False),
        sa.Column("chunk_ids", postgresql.JSONB(), nullable=False),
        sa.Column("revision_ids", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "projection_id", "relationship_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "projection_id"),
            ("relationship_projection_versions.workspace_id", "relationship_projection_versions.projection_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "(object_entity_id IS NULL) <> (object_value IS NULL)",
            name="ck_canonical_relationship_object",
        ),
        sa.CheckConstraint("frequency > 0", name="ck_canonical_relationship_frequency"),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_canonical_relationship_confidence",
        ),
        sa.CheckConstraint(
            "polarity IN ('affirmed', 'negated', 'uncertain')",
            name="ck_canonical_relationship_polarity",
        ),
    )
    op.create_table(
        "graph_mappings",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mapping_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column("assertion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_kind", sa.Text(), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "projection_id", "mapping_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "projection_id"),
            ("relationship_projection_versions.workspace_id", "relationship_projection_versions.projection_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "assertion_id"),
            ("assertion_evidence.workspace_id", "assertion_evidence.assertion_id"),
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id"),
            ("chunks.workspace_id", "chunks.revision_id", "chunks.chunk_id"),
        ),
        sa.CheckConstraint(
            "target_kind IN ('entity', 'relationship', 'assertion')",
            name="ck_graph_mappings_target_kind",
        ),
    )
    op.create_index(
        "ix_graph_mappings_chunk", "graph_mappings",
        ("workspace_id", "projection_id", "chunk_id"),
    )
    op.create_index(
        "ix_graph_mappings_target", "graph_mappings",
        ("workspace_id", "projection_id", "target_kind", "target_id"),
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
