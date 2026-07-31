"""force tenant and source ACL isolation for RAG application reads

Revision ID: rag_0005
Revises: rag_0004
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0005"
down_revision: str | Sequence[str] | None = "rag_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
WORKSPACE_MATCH = (
    "workspace_id = current_setting('app.current_workspace_id', true)"
)
SUBJECT_ACL = (
    "(acl_scope = 'workspace' OR acl_principal_ids ? "
    "current_setting('app.current_subject_id', true))"
)


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.current_chunks")
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

    _replace_policy("document_revisions", f"{WORKSPACE_MATCH} AND {SUBJECT_ACL}")
    _replace_policy("chunks", f"{WORKSPACE_MATCH} AND {SUBJECT_ACL}")
    _replace_policy("document_sections", _revision_acl("document_sections"))
    _replace_policy("ingestion_runs", _revision_acl("ingestion_runs"))
    _replace_policy("stage_manifests", _manifest_acl())
    _replace_policy("entity_observations", _chunk_acl("entity_observations"))
    _replace_policy("assertion_evidence", _chunk_acl("assertion_evidence"))
    _replace_policy("assertion_qualifiers", _qualifier_acl())
    _replace_policy("entities", _aggregate_chunk_acl("entities"))
    _replace_policy("relationships", _aggregate_chunk_acl("relationships"))

    for table in (
        "topics",
        "topic_memberships",
        "topic_aliases",
        "topic_update_queue",
    ):
        _replace_policy(table, "false")

    op.execute(f"GRANT SELECT ON public.current_chunks TO {APP_ROLE}")


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.current_chunks")
    op.execute(
        """
        CREATE VIEW public.current_chunks AS
        SELECT chunk.*
        FROM public.chunks AS chunk
        JOIN public.document_revisions AS revision
          ON revision.workspace_id = chunk.workspace_id
         AND revision.revision_id = chunk.revision_id
        WHERE revision.state = 'searchable'
          AND revision.base_readiness = 'ready'
        """
    )
    for table in _all_tables():
        policy = f"{table}_workspace_isolation_policy"
        op.execute(f"DROP POLICY IF EXISTS {policy} ON public.{table}")
        op.execute(
            f"CREATE POLICY {policy} ON public.{table} FOR ALL TO {APP_ROLE} "
            f"USING ({WORKSPACE_MATCH}) WITH CHECK ({WORKSPACE_MATCH})"
        )


def _replace_policy(table: str, expression: str) -> None:
    policy = f"{table}_workspace_isolation_policy"
    op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {policy} ON public.{table}")
    op.execute(
        f"CREATE POLICY {policy} ON public.{table} FOR ALL TO {APP_ROLE} "
        f"USING ({expression}) WITH CHECK ({expression})"
    )
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO {APP_ROLE}"
    )


def _revision_acl(table: str) -> str:
    return (
        f"{table}.workspace_id = current_setting('app.current_workspace_id', true) "
        "AND EXISTS (SELECT 1 FROM public.document_revisions AS revision "
        f"WHERE revision.workspace_id = {table}.workspace_id "
        f"AND revision.revision_id = {table}.revision_id)"
    )


def _manifest_acl() -> str:
    return (
        "stage_manifests.workspace_id = "
        "current_setting('app.current_workspace_id', true) "
        "AND EXISTS (SELECT 1 FROM public.ingestion_runs AS run "
        "WHERE run.workspace_id = stage_manifests.workspace_id "
        "AND run.run_id = stage_manifests.ingestion_run_id)"
    )


def _chunk_acl(table: str) -> str:
    return (
        f"{table}.workspace_id = current_setting('app.current_workspace_id', true) "
        "AND EXISTS (SELECT 1 FROM public.chunks AS chunk "
        f"WHERE chunk.workspace_id = {table}.workspace_id "
        f"AND chunk.revision_id = {table}.revision_id "
        f"AND chunk.chunk_id = {table}.chunk_id)"
    )


def _qualifier_acl() -> str:
    return (
        "assertion_qualifiers.workspace_id = "
        "current_setting('app.current_workspace_id', true) "
        "AND EXISTS (SELECT 1 FROM public.assertion_evidence AS assertion "
        "WHERE assertion.workspace_id = assertion_qualifiers.workspace_id "
        "AND assertion.revision_id = assertion_qualifiers.revision_id "
        "AND assertion.assertion_id = assertion_qualifiers.assertion_id)"
    )


def _aggregate_chunk_acl(table: str) -> str:
    return (
        f"{table}.workspace_id = current_setting('app.current_workspace_id', true) "
        f"AND jsonb_typeof({table}.source_chunk_ids) = 'array' "
        f"AND jsonb_array_length({table}.source_chunk_ids) > 0 "
        "AND NOT EXISTS ("
        f"SELECT 1 FROM jsonb_array_elements_text({table}.source_chunk_ids) AS source(chunk_id) "
        "WHERE NOT EXISTS (SELECT 1 FROM public.chunks AS chunk "
        f"WHERE chunk.workspace_id = {table}.workspace_id "
        "AND chunk.chunk_id = source.chunk_id))"
    )


def _all_tables() -> tuple[str, ...]:
    return (
        "chunks",
        "entities",
        "relationships",
        "topics",
        "topic_memberships",
        "topic_aliases",
        "topic_update_queue",
        "document_revisions",
        "ingestion_runs",
        "stage_manifests",
        "document_sections",
        "entity_observations",
        "assertion_evidence",
        "assertion_qualifiers",
    )
