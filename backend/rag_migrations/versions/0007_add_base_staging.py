"""add deterministic base-ingestion staging

Revision ID: rag_0007
Revises: rag_0006
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0007"
down_revision: str | Sequence[str] | None = "rag_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
CHECKSUM_PATTERN = r"^sha256:[0-9a-f]{64}$"


def upgrade() -> None:
    op.create_table(
        "staged_base_chunks",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("ingestion_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", sa.Text(), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("section_structural_key", sa.Text(), nullable=False),
        sa.Column("heading_path", postgresql.JSONB(), nullable=False),
        sa.Column("location_kind", sa.Text(), nullable=False),
        sa.Column("location_data", postgresql.JSONB(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("parser_version", sa.Text(), nullable=False),
        sa.Column("chunker_version", sa.Text(), nullable=False),
        sa.Column("pipeline_version", sa.Text(), nullable=False),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_modified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("acl_scope", sa.Text(), nullable=False),
        sa.Column(
            "acl_principal_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.PrimaryKeyConstraint("workspace_id", "ingestion_run_id", "chunk_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "ingestion_run_id"),
            ("ingestion_runs.workspace_id", "ingestion_runs.run_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "ingestion_run_id",
            "batch_id",
            "ordinal",
            name="uq_staged_base_chunks_batch_ordinal",
        ),
        sa.CheckConstraint("ordinal >= 0", name="ck_staged_base_chunks_ordinal"),
        sa.CheckConstraint("token_count > 0", name="ck_staged_base_chunks_tokens"),
        sa.CheckConstraint(
            f"content_hash ~ '{CHECKSUM_PATTERN}'",
            name="ck_staged_base_chunks_content_hash",
        ),
        sa.CheckConstraint(
            "location_kind IN ('page', 'code', 'message', 'section')",
            name="ck_staged_base_chunks_location_kind",
        ),
        sa.CheckConstraint(
            "acl_scope IN ('workspace', 'restricted')",
            name="ck_staged_base_chunks_acl_scope",
        ),
        sa.CheckConstraint(
            "jsonb_typeof(acl_principal_ids) = 'array' AND "
            "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
            name="ck_staged_base_chunks_acl_principals",
        ),
    )
    op.create_index(
        "ix_staged_base_chunks_run_batch",
        "staged_base_chunks",
        ("workspace_id", "ingestion_run_id", "batch_id"),
    )
    op.execute("ALTER TABLE public.staged_base_chunks ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE public.staged_base_chunks FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY staged_base_chunks_workspace ON public.staged_base_chunks "
        "USING (workspace_id = current_setting('app.current_workspace_id', true)) "
        "WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true))"
    )
    op.execute(
        f"GRANT SELECT, INSERT ON public.staged_base_chunks TO {APP_ROLE}"
    )
    op.execute(
        f"GRANT UPDATE (embedding) ON public.staged_base_chunks TO {APP_ROLE}"
    )


def downgrade() -> None:
    op.drop_index(
        "ix_staged_base_chunks_run_batch", table_name="staged_base_chunks"
    )
    op.drop_table("staged_base_chunks")
