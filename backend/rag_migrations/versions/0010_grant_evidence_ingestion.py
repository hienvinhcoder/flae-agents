"""grant immutable evidence writes to the ingestion role

Revision ID: rag_0010
Revises: rag_0009
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0010"
down_revision: str | Sequence[str] | None = "rag_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROLE = "flae_rag_ingestion"
WORKSPACE_MATCH = "workspace_id = current_setting('app.current_workspace_id', true)"
TABLES = (
    "entity_observations",
    "assertion_evidence",
    "assertion_qualifiers",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(
            f"CREATE POLICY {table}_ingestion_workspace_policy ON public.{table} "
            f"FOR ALL TO {ROLE} USING ({WORKSPACE_MATCH}) "
            f"WITH CHECK ({WORKSPACE_MATCH})"
        )
        op.execute(f"GRANT SELECT, INSERT ON public.{table} TO {ROLE}")


def downgrade() -> None:
    for table in TABLES:
        op.execute(
            f"DROP POLICY IF EXISTS {table}_ingestion_workspace_policy "
            f"ON public.{table}"
        )
        op.execute(f"REVOKE ALL PRIVILEGES ON public.{table} FROM {ROLE}")
