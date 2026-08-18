"""enforce immutable evidence identity and least-privilege writes

Revision ID: rag_0006
Revises: rag_0005
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0006"
down_revision: str | Sequence[str] | None = "rag_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"


def upgrade() -> None:
    op.execute(
        """
        CREATE FUNCTION public.guard_revision_identity() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF ROW(
            NEW.workspace_id, NEW.revision_id, NEW.source_id, NEW.document_id,
            NEW.source_external_id, NEW.source_version_key, NEW.content_checksum,
            NEW.acl_checksum, NEW.acl_scope, NEW.acl_principal_ids,
            NEW.is_synthetic, NEW.created_at
          ) IS DISTINCT FROM ROW(
            OLD.workspace_id, OLD.revision_id, OLD.source_id, OLD.document_id,
            OLD.source_external_id, OLD.source_version_key, OLD.content_checksum,
            OLD.acl_checksum, OLD.acl_scope, OLD.acl_principal_ids,
            OLD.is_synthetic, OLD.created_at
          ) THEN
            RAISE EXCEPTION 'document revision evidence identity is immutable';
          END IF;
          RETURN NEW;
        END
        $$
        """
    )
    op.execute(
        """CREATE TRIGGER trg_document_revisions_immutable
           BEFORE UPDATE ON public.document_revisions
           FOR EACH ROW EXECUTE FUNCTION public.guard_revision_identity()"""
    )
    op.execute(
        """
        CREATE FUNCTION public.guard_observation_evidence() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF ROW(
            NEW.workspace_id, NEW.observation_id, NEW.revision_id, NEW.chunk_id,
            NEW.raw_mention, NEW.normalized_mention, NEW.proposed_type,
            NEW.evidence_start, NEW.evidence_end, NEW.extractor_version,
            NEW.confidence, NEW.external_ids, NEW.disambiguation_attributes,
            NEW.evidence_key, NEW.created_at
          ) IS DISTINCT FROM ROW(
            OLD.workspace_id, OLD.observation_id, OLD.revision_id, OLD.chunk_id,
            OLD.raw_mention, OLD.normalized_mention, OLD.proposed_type,
            OLD.evidence_start, OLD.evidence_end, OLD.extractor_version,
            OLD.confidence, OLD.external_ids, OLD.disambiguation_attributes,
            OLD.evidence_key, OLD.created_at
          ) THEN
            RAISE EXCEPTION 'entity observation evidence is immutable';
          END IF;
          RETURN NEW;
        END
        $$
        """
    )
    op.execute(
        """CREATE TRIGGER trg_entity_observations_immutable
           BEFORE UPDATE ON public.entity_observations
           FOR EACH ROW EXECUTE FUNCTION public.guard_observation_evidence()"""
    )
    op.execute(
        """
        CREATE FUNCTION public.reject_immutable_row_update() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME;
        END
        $$
        """
    )
    for table in ("stage_manifests", "assertion_evidence", "assertion_qualifiers"):
        op.execute(
            f"CREATE TRIGGER trg_{table}_immutable BEFORE UPDATE ON public.{table} "
            "FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_row_update()"
        )

    _grant_insert_select_only("stage_manifests")
    _grant_insert_select_only("assertion_evidence")
    _grant_insert_select_only("assertion_qualifiers")
    _grant_insert_select_only("document_sections")
    op.execute(
        f"REVOKE UPDATE, DELETE ON public.document_revisions FROM {APP_ROLE}"
    )
    op.execute(
        f"GRANT UPDATE (state, base_readiness, graph_readiness, "
        "discovery_readiness, readiness_reason, updated_at) "
        f"ON public.document_revisions TO {APP_ROLE}"
    )
    op.execute(f"REVOKE UPDATE, DELETE ON public.entity_observations FROM {APP_ROLE}")
    op.execute(
        f"GRANT UPDATE (canonical_entity_id, resolver_version, resolver_confidence) "
        f"ON public.entity_observations TO {APP_ROLE}"
    )
    op.execute(f"REVOKE UPDATE, DELETE ON public.ingestion_runs FROM {APP_ROLE}")
    op.execute(
        f"GRANT UPDATE (workflow_id, status, error_code, updated_at) "
        f"ON public.ingestion_runs TO {APP_ROLE}"
    )


def downgrade() -> None:
    for table in (
        "document_revisions",
        "entity_observations",
        "ingestion_runs",
        "stage_manifests",
        "assertion_evidence",
        "assertion_qualifiers",
        "document_sections",
    ):
        op.execute(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO {APP_ROLE}"
        )
    for table in ("stage_manifests", "assertion_evidence", "assertion_qualifiers"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_immutable ON public.{table}")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_entity_observations_immutable "
        "ON public.entity_observations"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_document_revisions_immutable "
        "ON public.document_revisions"
    )
    op.execute("DROP FUNCTION IF EXISTS public.reject_immutable_row_update()")
    op.execute("DROP FUNCTION IF EXISTS public.guard_observation_evidence()")
    op.execute("DROP FUNCTION IF EXISTS public.guard_revision_identity()")


def _grant_insert_select_only(table: str) -> None:
    op.execute(f"REVOKE UPDATE, DELETE ON public.{table} FROM {APP_ROLE}")
