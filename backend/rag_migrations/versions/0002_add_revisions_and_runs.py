"""add immutable revisions, ingestion runs, and stage manifests

Revision ID: rag_0002
Revises: rag_0001
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0002"
down_revision: str | Sequence[str] | None = "rag_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHECKSUM_PATTERN = r"^sha256:[0-9a-f]{64}$"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "document_revisions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_external_id", sa.Text(), nullable=False),
        sa.Column("source_version_key", sa.Text(), nullable=False),
        sa.Column("content_checksum", sa.Text(), nullable=False),
        sa.Column("acl_checksum", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("base_readiness", sa.Text(), nullable=False),
        sa.Column("graph_readiness", sa.Text(), nullable=False),
        sa.Column("discovery_readiness", sa.Text(), nullable=False),
        sa.Column("readiness_reason", sa.Text(), nullable=True),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("workspace_id", "revision_id"),
        sa.UniqueConstraint(
            "workspace_id",
            "source_id",
            "source_external_id",
            "source_version_key",
            name="uq_document_revisions_connector_identity",
        ),
        sa.CheckConstraint(
            f"content_checksum ~ '{CHECKSUM_PATTERN}'",
            name="ck_document_revisions_content_checksum",
        ),
        sa.CheckConstraint(
            f"acl_checksum ~ '{CHECKSUM_PATTERN}'",
            name="ck_document_revisions_acl_checksum",
        ),
        sa.CheckConstraint(
            "state IN ('staging', 'searchable', 'superseded', 'failed', 'tombstoned')",
            name="ck_document_revisions_state",
        ),
        sa.CheckConstraint(
            "base_readiness IN ('pending', 'ready', 'failed')",
            name="ck_document_revisions_base_readiness",
        ),
        sa.CheckConstraint(
            "graph_readiness IN ('pending', 'ready', 'failed', 'stale')",
            name="ck_document_revisions_graph_readiness",
        ),
        sa.CheckConstraint(
            "discovery_readiness IN ('pending', 'ready', 'failed', 'stale')",
            name="ck_document_revisions_discovery_readiness",
        ),
        sa.CheckConstraint(
            "state <> 'searchable' OR base_readiness = 'ready'",
            name="ck_document_revisions_searchable_base_ready",
        ),
    )
    op.create_index(
        "uq_document_revisions_current_document",
        "document_revisions",
        ("workspace_id", "document_id"),
        unique=True,
        postgresql_where=sa.text("state = 'searchable'"),
    )
    op.create_index(
        "ix_document_revisions_workspace_state",
        "document_revisions",
        ("workspace_id", "state"),
    )

    op.create_table(
        "ingestion_runs",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workflow_id", sa.Text(), nullable=True),
        sa.Column("pipeline_version", sa.Text(), nullable=False),
        sa.Column("input_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("workspace_id", "run_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "pipeline_version",
            "input_checksum",
            name="uq_ingestion_runs_replay",
        ),
        sa.CheckConstraint(
            f"input_checksum ~ '{CHECKSUM_PATTERN}'",
            name="ck_ingestion_runs_input_checksum",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed', 'cancelled')",
            name="ck_ingestion_runs_status",
        ),
    )

    op.create_table(
        "stage_manifests",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("manifest_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ingestion_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stage_name", sa.Text(), nullable=False),
        sa.Column("batch_id", sa.Text(), nullable=False),
        sa.Column("pipeline_version", sa.Text(), nullable=False),
        sa.Column("input_checksum", sa.Text(), nullable=False),
        sa.Column("output_checksum", sa.Text(), nullable=False),
        sa.Column("item_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("workspace_id", "manifest_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "ingestion_run_id"),
            ("ingestion_runs.workspace_id", "ingestion_runs.run_id"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "ingestion_run_id",
            "stage_name",
            "batch_id",
            "pipeline_version",
            name="uq_stage_manifests_batch",
        ),
        sa.CheckConstraint(
            f"input_checksum ~ '{CHECKSUM_PATTERN}'",
            name="ck_stage_manifests_input_checksum",
        ),
        sa.CheckConstraint(
            f"output_checksum ~ '{CHECKSUM_PATTERN}'",
            name="ck_stage_manifests_output_checksum",
        ),
        sa.CheckConstraint("item_count >= 0", name="ck_stage_manifests_item_count"),
    )

    _backfill_legacy_revisions()


def downgrade() -> None:
    op.drop_table("stage_manifests")
    op.drop_table("ingestion_runs")
    op.drop_index(
        "ix_document_revisions_workspace_state", table_name="document_revisions"
    )
    op.drop_index(
        "uq_document_revisions_current_document", table_name="document_revisions"
    )
    op.drop_table("document_revisions")


def _backfill_legacy_revisions() -> None:
    op.execute(
        """
        WITH legacy_documents AS (
          SELECT
            workspace_id,
            source_document_id,
            string_agg(
              chunk_id || E'\\x1f' || COALESCE(text, ''),
              E'\\x1e' ORDER BY chunk_id
            ) AS normalized_content
          FROM public.chunks
          WHERE source_document_id IS NOT NULL
          GROUP BY workspace_id, source_document_id
        )
        INSERT INTO public.document_revisions (
          workspace_id, revision_id, source_id, document_id, source_external_id,
          source_version_key, content_checksum, acl_checksum, state,
          base_readiness, graph_readiness, discovery_readiness, is_synthetic
        )
        SELECT
          workspace_id,
          md5('legacy-revision:' || workspace_id || ':' || source_document_id)::uuid,
          md5('legacy-source:' || workspace_id)::uuid,
          CASE
            WHEN source_document_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN source_document_id::uuid
            ELSE md5('legacy-document:' || workspace_id || ':' || source_document_id)::uuid
          END,
          source_document_id,
          'legacy:' || md5(normalized_content),
          'sha256:' || encode(digest(normalized_content, 'sha256'), 'hex'),
          'sha256:' || encode(
            digest(workspace_id || ':' || source_document_id, 'sha256'), 'hex'
          ),
          'searchable', 'ready', 'pending', 'pending', true
        FROM legacy_documents
        ON CONFLICT DO NOTHING
        """
    )
