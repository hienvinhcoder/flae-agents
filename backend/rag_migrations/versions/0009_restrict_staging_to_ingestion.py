"""restrict staged evidence to the internal ingestion role

Revision ID: rag_0009
Revises: rag_0008
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0009"
down_revision: str | Sequence[str] | None = "rag_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS staged_base_chunks_workspace "
        "ON public.staged_base_chunks"
    )
    op.execute(
        "REVOKE ALL PRIVILEGES ON public.staged_base_chunks FROM flae_rag_app"
    )


def downgrade() -> None:
    op.execute(
        "CREATE POLICY staged_base_chunks_workspace ON public.staged_base_chunks "
        "USING (workspace_id = current_setting('app.current_workspace_id', true)) "
        "WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true))"
    )
    op.execute(
        "GRANT SELECT, INSERT ON public.staged_base_chunks TO flae_rag_app"
    )
    op.execute(
        "GRANT UPDATE (embedding) ON public.staged_base_chunks TO flae_rag_app"
    )
