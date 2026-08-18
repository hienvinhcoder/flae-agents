"""add immutable graph semantic projections

Revision ID: rag_0018
Revises: rag_0017
Create Date: 2026-08-03
"""

from collections.abc import Sequence

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0018"
down_revision: str | Sequence[str] | None = "rag_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = (
    "graph_semantic_projections",
    "entity_semantic_versions",
    "relationship_semantic_versions",
    "semantic_graph_mappings",
)


def upgrade() -> None:
    op.create_table(
        "graph_semantic_projections",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("semantic_projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profile_version", sa.Text(), nullable=False),
        sa.Column("embedding_model", sa.Text(), nullable=False),
        sa.Column("embedding_dimension", sa.Integer(), nullable=False),
        sa.Column("embedding_policy_version", sa.Text(), nullable=False),
        sa.Column("input_checksum", sa.Text(), nullable=False),
        sa.Column("projection_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("workspace_id", "semantic_projection_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "relationship_projection_id"),
            ("relationship_projection_versions.workspace_id", "relationship_projection_versions.projection_id"),
        ),
        sa.UniqueConstraint(
            "workspace_id", "resolution_run_id", "relationship_projection_id",
            "profile_version", "embedding_model", "embedding_dimension",
            "embedding_policy_version", "input_checksum",
            name="uq_graph_semantic_projection_replay",
        ),
        sa.CheckConstraint("embedding_dimension = 1024", name="ck_graph_semantic_dimension"),
        sa.CheckConstraint("status = 'complete'", name="ck_graph_semantic_complete"),
    )
    op.create_table(
        "entity_semantic_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("semantic_projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("canonical_name", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("aliases", postgresql.JSONB(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("observation_ids", postgresql.JSONB(), nullable=False),
        sa.Column("revision_ids", postgresql.JSONB(), nullable=False),
        sa.Column("chunk_ids", postgresql.JSONB(), nullable=False),
        sa.Column("frequency", sa.Integer(), nullable=False),
        sa.Column("degree", sa.Integer(), nullable=False),
        sa.Column("semantic_input", sa.Text(), nullable=False),
        sa.Column("semantic_input_checksum", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "semantic_projection_id", "entity_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "semantic_projection_id"),
            ("graph_semantic_projections.workspace_id", "graph_semantic_projections.semantic_projection_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint("frequency > 0 AND degree >= 0", name="ck_entity_semantic_counts"),
    )
    op.create_table(
        "relationship_semantic_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("semantic_projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("predicate", sa.Text(), nullable=False),
        sa.Column("object_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("object_value", sa.Text(), nullable=True),
        sa.Column("polarity", sa.Text(), nullable=False),
        sa.Column("keywords", postgresql.JSONB(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("assertion_ids", postgresql.JSONB(), nullable=False),
        sa.Column("revision_ids", postgresql.JSONB(), nullable=False),
        sa.Column("chunk_ids", postgresql.JSONB(), nullable=False),
        sa.Column("frequency", sa.Integer(), nullable=False),
        sa.Column("degree", sa.Integer(), nullable=False),
        sa.Column("semantic_input", sa.Text(), nullable=False),
        sa.Column("semantic_input_checksum", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "semantic_projection_id", "relationship_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "semantic_projection_id"),
            ("graph_semantic_projections.workspace_id", "graph_semantic_projections.semantic_projection_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "(object_entity_id IS NULL) <> (object_value IS NULL)",
            name="ck_relationship_semantic_object",
        ),
        sa.CheckConstraint("frequency > 0 AND degree >= 0", name="ck_relationship_semantic_counts"),
    )
    op.create_table(
        "semantic_graph_mappings",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("semantic_projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mapping_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column("target_kind", sa.Text(), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("evidence_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "semantic_projection_id", "mapping_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "semantic_projection_id"),
            ("graph_semantic_projections.workspace_id", "graph_semantic_projections.semantic_projection_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id"),
            ("chunks.workspace_id", "chunks.revision_id", "chunks.chunk_id"),
        ),
        sa.CheckConstraint(
            "target_kind IN ('entity', 'relationship', 'assertion')",
            name="ck_semantic_graph_mapping_target",
        ),
    )
    op.create_index(
        "ix_entity_semantic_embedding", "entity_semantic_versions", ("workspace_id", "semantic_projection_id")
    )
    op.create_index(
        "ix_relationship_semantic_embedding", "relationship_semantic_versions", ("workspace_id", "semantic_projection_id")
    )
    op.create_index(
        "ix_semantic_graph_mapping_chunk", "semantic_graph_mappings", ("workspace_id", "semantic_projection_id", "chunk_id")
    )
    _secure_tables()


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_table(table)


def _secure_tables() -> None:
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
