"""add structure-aware chunk provenance and current revision view

Revision ID: rag_0003
Revises: rag_0002
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0003"
down_revision: str | Sequence[str] | None = "rag_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHECKSUM_PATTERN = r"^sha256:[0-9a-f]{64}$"


def upgrade() -> None:
    op.add_column(
        "document_revisions",
        sa.Column("acl_scope", sa.Text(), nullable=False, server_default="workspace"),
    )
    op.add_column(
        "document_revisions",
        sa.Column(
            "acl_principal_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.create_check_constraint(
        "ck_document_revisions_acl_scope",
        "document_revisions",
        "acl_scope IN ('workspace', 'restricted')",
    )
    op.create_check_constraint(
        "ck_document_revisions_acl_principals",
        "document_revisions",
        "jsonb_typeof(acl_principal_ids) = 'array' AND "
        "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
    )

    op.create_table(
        "document_sections",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_section_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("heading_path", postgresql.JSONB(), nullable=False),
        sa.Column("structural_key", sa.Text(), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "revision_id", "section_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id", "parent_section_id"),
            (
                "document_sections.workspace_id",
                "document_sections.revision_id",
                "document_sections.section_id",
            ),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "structural_key",
            name="uq_document_sections_structural_key",
        ),
        sa.CheckConstraint("ordinal >= 0", name="ck_document_sections_ordinal"),
        sa.CheckConstraint(
            "jsonb_typeof(heading_path) = 'array'",
            name="ck_document_sections_heading_path",
        ),
        sa.CheckConstraint(
            f"content_hash ~ '{CHECKSUM_PATTERN}'",
            name="ck_document_sections_content_hash",
        ),
    )

    _add_chunk_columns()
    _backfill_orphan_revisions()
    _backfill_chunk_provenance()
    _enforce_chunk_constraints()
    _create_current_chunks_view()


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.current_chunks")
    op.drop_constraint("fk_chunks_section", "chunks", type_="foreignkey")
    op.drop_constraint("fk_chunks_revision", "chunks", type_="foreignkey")
    op.drop_constraint("ck_chunks_acl_principals", "chunks", type_="check")
    op.drop_constraint("ck_chunks_acl_scope", "chunks", type_="check")
    op.drop_constraint("ck_chunks_location_kind", "chunks", type_="check")
    op.drop_constraint("ck_chunks_content_hash", "chunks", type_="check")
    for column in (
        "acl_principal_ids",
        "acl_scope",
        "ingested_at",
        "source_modified_at",
        "source_type",
        "source_name",
        "pipeline_version",
        "chunker_version",
        "parser_version",
        "content_hash",
        "location_data",
        "location_kind",
        "heading_path",
        "section_id",
        "document_id",
        "source_id",
        "revision_id",
    ):
        op.drop_column("chunks", column)
    op.drop_table("document_sections")
    op.drop_constraint(
        "ck_document_revisions_acl_principals", "document_revisions", type_="check"
    )
    op.drop_constraint(
        "ck_document_revisions_acl_scope", "document_revisions", type_="check"
    )
    op.drop_column("document_revisions", "acl_principal_ids")
    op.drop_column("document_revisions", "acl_scope")


def _add_chunk_columns() -> None:
    columns = (
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "heading_path",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("location_kind", sa.Text(), nullable=True),
        sa.Column("location_data", postgresql.JSONB(), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=True),
        sa.Column("parser_version", sa.Text(), nullable=True),
        sa.Column("chunker_version", sa.Text(), nullable=True),
        sa.Column("pipeline_version", sa.Text(), nullable=True),
        sa.Column("source_name", sa.Text(), nullable=True),
        sa.Column("source_type", sa.Text(), nullable=True),
        sa.Column("source_modified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "acl_scope", sa.Text(), nullable=False, server_default="workspace"
        ),
        sa.Column(
            "acl_principal_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    for column in columns:
        op.add_column("chunks", column)


def _backfill_orphan_revisions() -> None:
    op.execute(
        """
        INSERT INTO public.document_revisions (
          workspace_id, revision_id, source_id, document_id, source_external_id,
          source_version_key, content_checksum, acl_checksum, state,
          base_readiness, graph_readiness, discovery_readiness, is_synthetic
        )
        SELECT
          workspace_id,
          md5('legacy-orphan-revision:' || workspace_id || ':' || chunk_id)::uuid,
          md5('legacy-source:' || workspace_id)::uuid,
          md5('legacy-orphan-document:' || workspace_id || ':' || chunk_id)::uuid,
          'legacy-orphan:' || chunk_id,
          'legacy:' || md5(COALESCE(text, '')),
          'sha256:' || encode(digest(COALESCE(text, ''), 'sha256'), 'hex'),
          'sha256:' || encode(digest(workspace_id || ':' || chunk_id, 'sha256'), 'hex'),
          'searchable', 'ready', 'pending', 'pending', true
        FROM public.chunks
        WHERE source_document_id IS NULL
        ON CONFLICT DO NOTHING
        """
    )


def _backfill_chunk_provenance() -> None:
    op.execute(
        """
        UPDATE public.chunks AS chunk
        SET
          revision_id = revision.revision_id,
          source_id = revision.source_id,
          document_id = revision.document_id,
          location_kind = 'section',
          location_data = '{"heading_path":["Legacy import"]}'::jsonb,
          content_hash = 'sha256:' || encode(
            digest(COALESCE(chunk.text, ''), 'sha256'), 'hex'
          ),
          parser_version = 'legacy',
          chunker_version = 'legacy',
          pipeline_version = 'legacy',
          source_name = COALESCE(chunk.source_document_id, 'Legacy import'),
          source_type = 'legacy',
          source_modified_at = now(),
          ingested_at = now()
        FROM public.document_revisions AS revision
        WHERE chunk.workspace_id = revision.workspace_id
          AND revision.source_external_id = CASE
            WHEN chunk.source_document_id IS NULL THEN 'legacy-orphan:' || chunk.chunk_id
            ELSE chunk.source_document_id
          END
          AND revision.is_synthetic = true
        """
    )


def _enforce_chunk_constraints() -> None:
    for column in (
        "revision_id",
        "source_id",
        "document_id",
        "location_kind",
        "location_data",
        "content_hash",
        "parser_version",
        "chunker_version",
        "pipeline_version",
        "source_name",
        "source_type",
        "source_modified_at",
        "ingested_at",
    ):
        op.alter_column("chunks", column, nullable=False)
    op.create_foreign_key(
        "fk_chunks_revision",
        "chunks",
        "document_revisions",
        ("workspace_id", "revision_id"),
        ("workspace_id", "revision_id"),
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_chunks_section",
        "chunks",
        "document_sections",
        ("workspace_id", "revision_id", "section_id"),
        ("workspace_id", "revision_id", "section_id"),
    )
    op.create_check_constraint(
        "ck_chunks_content_hash", "chunks", f"content_hash ~ '{CHECKSUM_PATTERN}'"
    )
    op.create_check_constraint(
        "ck_chunks_location_kind",
        "chunks",
        "location_kind IN ('page', 'code', 'message', 'section')",
    )
    op.create_check_constraint(
        "ck_chunks_acl_scope",
        "chunks",
        "acl_scope IN ('workspace', 'restricted')",
    )
    op.create_check_constraint(
        "ck_chunks_acl_principals",
        "chunks",
        "jsonb_typeof(acl_principal_ids) = 'array' AND "
        "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
    )
    op.create_index(
        "ix_chunks_workspace_revision", "chunks", ("workspace_id", "revision_id")
    )


def _create_current_chunks_view() -> None:
    op.execute(
        """
        CREATE VIEW public.current_chunks WITH (security_invoker = true) AS
        SELECT chunk.*
        FROM public.chunks AS chunk
        JOIN public.document_revisions AS revision
          ON revision.workspace_id = chunk.workspace_id
         AND revision.revision_id = chunk.revision_id
        WHERE revision.state = 'searchable'
          AND revision.base_readiness = 'ready'
        """
    )
