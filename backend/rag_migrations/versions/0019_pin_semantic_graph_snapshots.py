"""pin complete semantic projections to graph snapshots

Revision ID: rag_0019
Revises: rag_0018
Create Date: 2026-08-03
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0019"
down_revision: str | Sequence[str] | None = "rag_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
SEMANTIC_VIEWS = (
    "current_entity_semantic_versions",
    "current_relationship_semantic_versions",
    "current_semantic_graph_mappings",
)


def upgrade() -> None:
    op.add_column(
        "graph_snapshots",
        sa.Column(
            "semantic_projection_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_graph_snapshots_semantic_projection",
        "graph_snapshots",
        "graph_semantic_projections",
        ("workspace_id", "semantic_projection_id"),
        ("workspace_id", "semantic_projection_id"),
    )
    op.create_index(
        "ix_graph_snapshots_semantic_projection",
        "graph_snapshots",
        ("workspace_id", "semantic_projection_id"),
    )
    _create_semantic_views()


def downgrade() -> None:
    for view in SEMANTIC_VIEWS:
        op.execute(f"DROP VIEW IF EXISTS public.{view}")
    op.drop_index(
        "ix_graph_snapshots_semantic_projection", table_name="graph_snapshots"
    )
    op.drop_constraint(
        "fk_graph_snapshots_semantic_projection",
        "graph_snapshots",
        type_="foreignkey",
    )
    op.drop_column("graph_snapshots", "semantic_projection_id")


def _create_semantic_views() -> None:
    joins = {
        "current_entity_semantic_versions": "entity_semantic_versions",
        "current_relationship_semantic_versions": "relationship_semantic_versions",
        "current_semantic_graph_mappings": "semantic_graph_mappings",
    }
    for view, table in joins.items():
        op.execute(
            f"""CREATE VIEW public.{view}
                  WITH (security_invoker = true) AS
                SELECT semantic.*
                  FROM public.graph_snapshots AS snapshot
                  JOIN public.{table} AS semantic
                    ON semantic.workspace_id = snapshot.workspace_id
                   AND semantic.semantic_projection_id = snapshot.semantic_projection_id
                 WHERE snapshot.status = 'current'
                   AND snapshot.semantic_projection_id IS NOT NULL"""
        )
        op.execute(
            f"GRANT SELECT ON public.{view} TO {APP_ROLE}, {INGESTION_ROLE}"
        )
