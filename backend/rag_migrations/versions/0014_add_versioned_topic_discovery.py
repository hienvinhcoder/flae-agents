"""add immutable topic-discovery versions and evidence-backed memberships

Revision ID: rag_0014
Revises: rag_0013
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0014"
down_revision: str | Sequence[str] | None = "rag_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
TABLES = (
    "topic_discovery_runs",
    "topic_versions",
    "topic_membership_versions",
    "topic_membership_revision_evidence",
    "topic_lineage_events",
)


def upgrade() -> None:
    op.create_table(
        "topic_discovery_runs",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("graph_snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_set_checksum", sa.Text(), nullable=False),
        sa.Column("taxonomy_version", sa.Text(), nullable=False),
        sa.Column("input_checksum", sa.Text(), nullable=False),
        sa.Column("taxonomy_checksum", sa.Text(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("taxonomy_change_count", sa.Integer(), nullable=False),
        sa.Column("taxonomy_churn", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("workspace_id", "discovery_run_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "graph_snapshot_id"),
            ("graph_snapshots.workspace_id", "graph_snapshots.snapshot_id"),
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "taxonomy_version",
            "input_checksum",
            name="uq_topic_discovery_replay",
        ),
        sa.CheckConstraint(
            "status = 'complete'", name="ck_topic_discovery_runs_complete"
        ),
        sa.CheckConstraint(
            "taxonomy_churn >= 0 AND taxonomy_churn <= 1",
            name="ck_topic_discovery_runs_churn",
        ),
    )
    op.create_table(
        "topic_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("aliases", postgresql.JSONB(), nullable=False),
        sa.Column("lifecycle", sa.Text(), nullable=False),
        sa.Column("primary_parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("secondary_parent_ids", postgresql.JSONB(), nullable=False),
        sa.Column("promotion_evidence_count", sa.Integer(), nullable=False),
        sa.Column("discovery_version", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "discovery_run_id", "topic_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "discovery_run_id"),
            ("topic_discovery_runs.workspace_id", "topic_discovery_runs.discovery_run_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "lifecycle IN ('candidate', 'active', 'stale', 'merged', 'archived')",
            name="ck_topic_versions_lifecycle",
        ),
        sa.CheckConstraint(
            "lifecycle <> 'active' OR promotion_evidence_count >= 2",
            name="ck_topic_versions_active_evidence",
        ),
    )
    op.create_table(
        "topic_membership_versions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_kind", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("derivation", sa.Text(), nullable=False),
        sa.Column("first_seen_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_seen_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supporting_evidence_ids", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint(
            "workspace_id", "discovery_run_id", "membership_id"
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "discovery_run_id", "topic_id"),
            (
                "topic_versions.workspace_id",
                "topic_versions.discovery_run_id",
                "topic_versions.topic_id",
            ),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "discovery_run_id",
            "topic_id",
            "target_kind",
            "target_id",
            name="uq_topic_membership_versions_target",
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_topic_membership_versions_confidence",
        ),
        sa.CheckConstraint(
            "target_kind IN ('source', 'document', 'chunk', 'entity', 'assertion', 'topic')",
            name="ck_topic_membership_versions_target_kind",
        ),
        sa.CheckConstraint(
            "derivation IN ('source_structure', 'graph_overlap', 'embedding', 'temporal', 'combined')",
            name="ck_topic_membership_versions_derivation",
        ),
    )
    op.create_table(
        "topic_membership_revision_evidence",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column("supporting_evidence_ids", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint(
            "workspace_id",
            "discovery_run_id",
            "membership_id",
            "revision_id",
            "chunk_id",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "discovery_run_id", "membership_id"),
            (
                "topic_membership_versions.workspace_id",
                "topic_membership_versions.discovery_run_id",
                "topic_membership_versions.membership_id",
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
        ),
    )
    op.create_table(
        "topic_lineage_events",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("discovery_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lineage_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("predecessor_ids", postgresql.JSONB(), nullable=False),
        sa.Column("successor_ids", postgresql.JSONB(), nullable=False),
        sa.Column("evidence_ids", postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "discovery_run_id", "lineage_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "discovery_run_id"),
            ("topic_discovery_runs.workspace_id", "topic_discovery_runs.discovery_run_id"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "event_type IN ('created', 'renamed', 'merged', 'split', 'stale', 'archived')",
            name="ck_topic_lineage_events_type",
        ),
    )
    _apply_security()


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_table(table)


def _apply_security() -> None:
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
