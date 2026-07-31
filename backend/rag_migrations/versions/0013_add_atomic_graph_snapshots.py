"""add atomic graph snapshots and lifecycle invalidation

Revision ID: rag_0013
Revises: rag_0012
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0013"
down_revision: str | Sequence[str] | None = "rag_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
ZERO_CHECKSUM = "sha256:" + "0" * 64


def upgrade() -> None:
    op.add_column(
        "relationship_projection_versions",
        sa.Column(
            "revision_set_checksum",
            sa.Text(),
            nullable=False,
            server_default=ZERO_CHECKSUM,
        ),
    )
    op.create_table(
        "graph_snapshots",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("projection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resolution_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_set_checksum", sa.Text(), nullable=False),
        sa.Column("graph_checksum", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("workspace_id", "snapshot_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "projection_id"),
            ("relationship_projection_versions.workspace_id", "relationship_projection_versions.projection_id"),
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
        ),
        sa.CheckConstraint(
            "status IN ('staging', 'current', 'historical', 'failed')",
            name="ck_graph_snapshots_status",
        ),
    )
    op.create_index(
        "uq_graph_snapshots_current_workspace",
        "graph_snapshots",
        ("workspace_id",),
        unique=True,
        postgresql_where=sa.text("status = 'current'"),
    )
    op.create_table(
        "graph_snapshot_revisions",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_checksum", sa.Text(), nullable=False),
        sa.Column("acl_checksum", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("workspace_id", "snapshot_id", "revision_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "snapshot_id"),
            ("graph_snapshots.workspace_id", "graph_snapshots.snapshot_id"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
        ),
    )
    for table in ("graph_snapshots", "graph_snapshot_revisions"):
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
        f"ON public.graph_snapshots TO {INGESTION_ROLE}"
    )
    _create_current_views()
    _create_invalidation_trigger()


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_invalidate_graph_snapshot "
        "ON public.document_revisions"
    )
    op.execute("DROP FUNCTION IF EXISTS public.invalidate_graph_snapshot()")
    for view in (
        "current_graph_mappings",
        "current_canonical_relationships",
        "current_canonical_entities",
        "current_graph_snapshots",
    ):
        op.execute(f"DROP VIEW IF EXISTS public.{view}")
    op.drop_table("graph_snapshot_revisions")
    op.drop_table("graph_snapshots")
    op.drop_column("relationship_projection_versions", "revision_set_checksum")


def _create_current_views() -> None:
    op.execute(
        """CREATE VIEW public.current_graph_snapshots
             WITH (security_invoker = true) AS
           SELECT * FROM public.graph_snapshots WHERE status = 'current'"""
    )
    op.execute(
        """CREATE VIEW public.current_canonical_entities
             WITH (security_invoker = true) AS
           SELECT entity.*
             FROM public.current_graph_snapshots AS snapshot
             JOIN public.canonical_entity_versions AS entity
               ON entity.workspace_id = snapshot.workspace_id
              AND entity.resolution_run_id = snapshot.resolution_run_id"""
    )
    op.execute(
        """CREATE VIEW public.current_canonical_relationships
             WITH (security_invoker = true) AS
           SELECT relationship.*
             FROM public.current_graph_snapshots AS snapshot
             JOIN public.canonical_relationship_versions AS relationship
               ON relationship.workspace_id = snapshot.workspace_id
              AND relationship.projection_id = snapshot.projection_id"""
    )
    op.execute(
        """CREATE VIEW public.current_graph_mappings
             WITH (security_invoker = true) AS
           SELECT mapping.*
             FROM public.current_graph_snapshots AS snapshot
             JOIN public.graph_mappings AS mapping
               ON mapping.workspace_id = snapshot.workspace_id
              AND mapping.projection_id = snapshot.projection_id"""
    )
    for view in (
        "current_graph_snapshots",
        "current_canonical_entities",
        "current_canonical_relationships",
        "current_graph_mappings",
    ):
        op.execute(f"GRANT SELECT ON public.{view} TO {APP_ROLE}, {INGESTION_ROLE}")


def _create_invalidation_trigger() -> None:
    op.execute(
        """CREATE FUNCTION public.invalidate_graph_snapshot()
           RETURNS trigger
           LANGUAGE plpgsql
           SECURITY DEFINER
           SET search_path = pg_catalog, public
           AS $$
           DECLARE affected_workspace text;
           DECLARE affected_revision uuid;
           BEGIN
             affected_workspace := COALESCE(OLD.workspace_id, NEW.workspace_id);
             affected_revision := COALESCE(OLD.revision_id, NEW.revision_id);
             IF TG_OP = 'DELETE' OR
                OLD.state IS DISTINCT FROM NEW.state OR
                OLD.acl_checksum IS DISTINCT FROM NEW.acl_checksum THEN
               UPDATE public.document_revisions AS revision
                  SET graph_readiness = 'stale',
                      readiness_reason = 'graph_snapshot_invalidated',
                      updated_at = now()
                WHERE revision.workspace_id = affected_workspace
                  AND EXISTS (
                    SELECT 1
                      FROM public.graph_snapshots AS snapshot
                      JOIN public.graph_snapshot_revisions AS member
                        ON member.workspace_id = snapshot.workspace_id
                       AND member.snapshot_id = snapshot.snapshot_id
                     WHERE snapshot.workspace_id = affected_workspace
                       AND snapshot.status = 'current'
                       AND member.revision_id = affected_revision
                  );
               UPDATE public.graph_snapshots AS snapshot
                  SET status = 'historical'
                WHERE snapshot.workspace_id = affected_workspace
                  AND snapshot.status = 'current'
                  AND EXISTS (
                    SELECT 1 FROM public.graph_snapshot_revisions AS member
                     WHERE member.workspace_id = snapshot.workspace_id
                       AND member.snapshot_id = snapshot.snapshot_id
                       AND member.revision_id = affected_revision
                  );
             END IF;
             RETURN NULL;
           END $$"""
    )
    op.execute(
        """CREATE TRIGGER trg_invalidate_graph_snapshot
           AFTER UPDATE OF state, acl_checksum OR DELETE
           ON public.document_revisions
           FOR EACH ROW EXECUTE FUNCTION public.invalidate_graph_snapshot()"""
    )
