"""add a least-privilege internal ingestion role

Revision ID: rag_0008
Revises: rag_0007
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0008"
down_revision: str | Sequence[str] | None = "rag_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROLE = "flae_rag_ingestion"
WORKSPACE_MATCH = "workspace_id = current_setting('app.current_workspace_id', true)"
TABLES = (
    "document_revisions",
    "ingestion_runs",
    "stage_manifests",
    "document_sections",
    "staged_base_chunks",
    "chunks",
)


def upgrade() -> None:
    op.execute(
        f"""DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{ROLE}') THEN
          CREATE ROLE {ROLE}
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
        END IF;
        END $$"""
    )
    op.execute(f"GRANT {ROLE} TO CURRENT_USER")
    op.execute(f"GRANT USAGE ON SCHEMA public TO {ROLE}")
    for table in TABLES:
        op.execute(
            f"CREATE POLICY {table}_ingestion_workspace_policy ON public.{table} "
            f"FOR ALL TO {ROLE} USING ({WORKSPACE_MATCH}) "
            f"WITH CHECK ({WORKSPACE_MATCH})"
        )
        op.execute(f"GRANT SELECT, INSERT ON public.{table} TO {ROLE}")
    op.execute(
        f"GRANT UPDATE (embedding) ON public.staged_base_chunks TO {ROLE}"
    )
    op.execute(
        f"GRANT UPDATE (state, base_readiness, graph_readiness, "
        f"discovery_readiness, readiness_reason, updated_at) "
        f"ON public.document_revisions TO {ROLE}"
    )
    op.execute(
        f"GRANT UPDATE (workflow_id, status, error_code, updated_at) "
        f"ON public.ingestion_runs TO {ROLE}"
    )


def downgrade() -> None:
    for table in TABLES:
        op.execute(
            f"DROP POLICY IF EXISTS {table}_ingestion_workspace_policy "
            f"ON public.{table}"
        )
        op.execute(f"REVOKE ALL PRIVILEGES ON public.{table} FROM {ROLE}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {ROLE}")
    op.execute(f"REVOKE {ROLE} FROM CURRENT_USER")
    op.execute(f"DROP ROLE IF EXISTS {ROLE}")
