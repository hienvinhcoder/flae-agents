"""consolidated: drop unused tables + partition all rag_db tables by workspace

Revision ID: rag_0023
Revises: rag_0020
Create Date: 2026-08-21

Supersedes rag_0021 (drop unused tables) and rag_0022 (partition by workspace).
Consolidated into a single migration because the app has not been released yet,
avoiding the broken intermediate state where 0022 referenced non-existent columns
(workflow_id, status, error_code) in the new document_revisions table definition.
"""

from collections.abc import Sequence

from alembic import op


revision: str = "rag_0023"
down_revision: str | Sequence[str] | None = "rag_0020"
branch_labels: str | None = None
depends_on: str | None = None

APP_ROLE = "flae_rag_app"
INGESTION_ROLE = "flae_rag_ingestion"
WORKSPACE_MATCH = (
    "workspace_id = current_setting('app.current_workspace_id', true)"
)
SUBJECT_ACL = (
    "(acl_scope = 'workspace' OR acl_principal_ids ? "
    "current_setting('app.current_subject_id', true))"
)
CHECKSUM_PATTERN = r"^sha256:[0-9a-f]{64}$"

# Tables/views dropped from rag_0021 (superseded)
UNUSED_TABLES = (
    "entity_observations",
    "assertion_evidence",
    "assertion_qualifiers",
    "entity_resolution_runs",
    "canonical_entity_versions",
    "entity_resolution_assignments",
    "entity_resolution_lineage",
    "relationship_projection_versions",
    "canonical_relationship_versions",
    "graph_mappings",
    "graph_snapshots",
    "graph_snapshot_revisions",
    "topic_discovery_runs",
    "topic_lineage_events",
    "discovery_snapshots",
    "discovery_snapshot_payloads",
    "memory_state_rules",
    "memory_state_projections",
    "graph_semantic_projections",
    "semantic_graph_mappings",
    "topic_update_queue",
    "domain_update_queue",
    "entity_semantic_versions",
)

UNUSED_VIEWS = (
    "current_graph_snapshots",
    "current_canonical_entities",
    "current_canonical_relationships",
    "current_graph_mappings",
    "current_semantic_graph_mappings",
)


# ---------------------------------------------------------------------------
# Main upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # ── Phase 0: drop unused tables/views (from rag_0021) ───────────────
    for view in UNUSED_VIEWS:
        op.execute(f"DROP VIEW IF EXISTS public.{view} CASCADE")
    for table in UNUSED_TABLES:
        op.execute(f"DROP TABLE IF EXISTS public.{table} CASCADE")

    # ── Phase 1: install helper function ─────────────────────────────────
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.create_workspace_partitions(p_workspace_id TEXT)
        RETURNS void AS $$
        DECLARE
            safe_name TEXT := regexp_replace(p_workspace_id, '[^a-zA-Z0-9_]', '_', 'g');
            tbl TEXT;
            tables TEXT[] := ARRAY[
                'chunks', 'entities', 'relationships', 'topics',
                'topic_memberships', 'topic_aliases',
                'document_revisions', 'document_sections',
                'ingestion_runs', 'stage_manifests',
                'staged_base_chunks', 'knowledge_domains'
            ];
        BEGIN
            FOREACH tbl IN ARRAY tables LOOP
                EXECUTE format(
                    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES IN (%L)',
                    tbl || '_ws_' || safe_name, tbl, p_workspace_id
                );
            END LOOP;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute("DROP VIEW IF EXISTS public.current_chunks")

    # ── Phase 2: parent / standalone tables ──────────────────────────────
    _swap_entities()
    _swap_relationships()
    _swap_topics()
    _swap_topic_memberships()
    _swap_topic_aliases()
    _swap_document_revisions()
    _swap_knowledge_domains()

    # ── Phase 3: child tables ────────────────────────────────────────────
    _swap_ingestion_runs()
    _swap_stage_manifests()
    _swap_document_sections()
    _swap_chunks()
    _swap_staged_base_chunks()

    # ── Phase 4: recreate view + triggers ────────────────────────────────
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
    op.execute(f"GRANT SELECT ON public.current_chunks TO {APP_ROLE}")

    op.execute(
        """CREATE TRIGGER trg_document_revisions_immutable
           BEFORE UPDATE ON public.document_revisions
           FOR EACH ROW EXECUTE FUNCTION public.guard_revision_identity()"""
    )
    op.execute(
        """CREATE TRIGGER trg_stage_manifests_immutable
           BEFORE UPDATE ON public.stage_manifests
           FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_row_update()"""
    )


def downgrade() -> None:
    raise NotImplementedError(
        "Cannot downgrade: dropped tables are not recreated and "
        "partitioned tables cannot be un-partitioned. "
        "Use 'alembic upgrade head' to rebuild from scratch."
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_column_names(columns_sql: str) -> list[str]:
    """Extract column names from the columns_sql definition string."""
    names: list[str] = []
    for raw_line in columns_sql.strip().splitlines():
        line = raw_line.strip().rstrip(",")
        if not line or line.startswith("--"):
            continue
        names.append(line.split()[0])
    return names


def _swap_table(
    table: str,
    columns_sql: str,
    *,
    inline_constraints: str = "",
    inline_fk_targets: dict[str, str] | None = None,
    post_create_alter: list[str] | None = None,
    unique_constraints: list[tuple[str, list[str]]] | None = None,
    check_constraints: list[tuple[str, str]] | None = None,
    btree_indexes: list[tuple[str, list[str], bool]] | None = None,
    hnsw_embedding: bool = False,
    app_grants: str | None = None,
    ingestion_grants: list[str] | None = None,
    rls_policies: dict[str, str] | None = None,
    ingestion_policies: list[str] | None = None,
    skip_check_constraints: list[str] | None = None,
) -> None:
    """Drop-and-recreate a table as a LIST-partitioned table on workspace_id."""

    skip_check_constraints = skip_check_constraints or []

    # 1. Create partitioned table (no FK, no unique, no check – added via ALTER)
    op.execute(
        f"CREATE TABLE public.{table}_new ({columns_sql}) "
        f"PARTITION BY LIST (workspace_id)"
    )

    # 2. Default partition
    op.execute(
        f"CREATE TABLE public.{table}_new_default "
        f"PARTITION OF public.{table}_new DEFAULT"
    )

    # 3. Copy data using explicit column names to avoid column-order mismatches
    cols = ", ".join(_extract_column_names(columns_sql))
    op.execute(f"INSERT INTO public.{table}_new ({cols}) SELECT {cols} FROM public.{table}")

    # 4. Drop old, rename new
    op.execute(f"DROP TABLE public.{table} CASCADE")
    op.execute(f"ALTER TABLE public.{table}_new RENAME TO {table}")

    # 5. Add inline FK targets via ALTER TABLE
    if inline_fk_targets:
        for fk_cols, ref in inline_fk_targets.items():
            safe_fk_name = fk_cols.replace(", ", "_").replace(",", "_")
            # ref may or may not include ON DELETE CASCADE — normalise
            ref_clean = ref.rstrip()
            cascade = ""
            if "ON DELETE" not in ref_clean.upper():
                cascade = " ON DELETE CASCADE"
            op.execute(
                f"ALTER TABLE public.{table} ADD CONSTRAINT fk_{table}_{safe_fk_name} "
                f"FOREIGN KEY ({fk_cols}) REFERENCES {ref_clean}{cascade}"
            )

    # 6. Additional post-create ALTER statements (self-refs, etc.)
    if post_create_alter:
        for stmt in post_create_alter:
            op.execute(stmt)

    # 7. Unique constraints (require partition key)
    if unique_constraints:
        for name, cols in unique_constraints:
            cols_str = ", ".join(cols)
            op.execute(
                f"ALTER TABLE public.{table} ADD CONSTRAINT {name} "
                f"UNIQUE ({cols_str})"
            )

    # 8. Check constraints
    if check_constraints:
        for name, expr in check_constraints:
            if name in skip_check_constraints:
                continue
            op.execute(
                f"ALTER TABLE public.{table} ADD CONSTRAINT {name} "
                f"CHECK ({expr})"
            )

    # 9. B-tree indexes
    if btree_indexes:
        for name, cols, unique in btree_indexes:
            cols_str = ", ".join(cols)
            unique_kw = "UNIQUE " if unique else ""
            op.execute(
                f"CREATE {unique_kw}INDEX {name} ON public.{table} ({cols_str})"
            )

    # 10. HNSW vector index
    if hnsw_embedding:
        op.execute(
            f"CREATE INDEX ix_{table}_embedding_hnsw ON public.{table} "
            f"USING hnsw (embedding vector_cosine_ops) "
            f"WITH (m = 16, ef_construction = 64)"
        )

    # 11. App role grants
    if app_grants is None:
        app_grants = "SELECT, INSERT, UPDATE, DELETE"
    op.execute(f"GRANT {app_grants} ON public.{table} TO {APP_ROLE}")

    # 12. RLS policies for app role
    if rls_policies:
        for policy_name, expression in rls_policies.items():
            _apply_rls_policy(table, policy_name, expression)
    else:
        _apply_rls_policy(
            table,
            f"{table}_workspace_isolation_policy",
            WORKSPACE_MATCH,
        )

    # 13. Ingestion role policies and grants
    if ingestion_policies:
        for pol_name in ingestion_policies:
            op.execute(
                f"CREATE POLICY {pol_name} ON public.{table} "
                f"FOR ALL TO {INGESTION_ROLE} "
                f"USING ({WORKSPACE_MATCH}) WITH CHECK ({WORKSPACE_MATCH})"
            )
    if ingestion_grants:
        for grant_stmt in ingestion_grants:
            op.execute(grant_stmt)


def _apply_rls_policy(table: str, policy_name: str, expression: str) -> None:
    """Enable RLS, force it, drop any stale policy, and create the new one."""
    op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS {policy_name} ON public.{table}")
    op.execute(
        f"CREATE POLICY {policy_name} ON public.{table} "
        f"FOR ALL TO {APP_ROLE} "
        f"USING ({expression}) WITH CHECK ({expression})"
    )


# ---------------------------------------------------------------------------
# Table-specific swap functions
# ---------------------------------------------------------------------------

def _swap_entities() -> None:
    _swap_table(
        "entities",
        """
        workspace_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT,
        entity_type TEXT,
        description TEXT,
        source_chunk_ids JSONB,
        chunk_descriptions JSONB,
        degree INT,
        frequency INT,
        embedding vector(1024)
        """,
        unique_constraints=[
            ("pk_entities", ["workspace_id", "entity_id"]),
        ],
        hnsw_embedding=True,
        rls_policies={
            "entities_workspace_isolation_policy": WORKSPACE_MATCH,
        },
    )


def _swap_relationships() -> None:
    _swap_table(
        "relationships",
        """
        workspace_id TEXT NOT NULL,
        relation_id TEXT NOT NULL,
        source_id TEXT,
        source_name TEXT,
        target_id TEXT,
        target_name TEXT,
        keywords TEXT,
        description TEXT,
        source_chunk_ids JSONB,
        chunk_meta JSONB,
        frequency INT,
        degree INT,
        embedding vector(1024)
        """,
        unique_constraints=[
            ("pk_relationships", ["workspace_id", "relation_id"]),
        ],
        hnsw_embedding=True,
        rls_policies={
            "relationships_workspace_isolation_policy": WORKSPACE_MATCH,
        },
    )


def _swap_topics() -> None:
    _swap_table(
        "topics",
        """
        workspace_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        parent_topic_id TEXT,
        domain_id TEXT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        type TEXT NOT NULL,
        summary TEXT,
        current_state TEXT,
        status TEXT NOT NULL,
        confidence FLOAT DEFAULT 1.0,
        embedding vector(1024),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
        """,
        unique_constraints=[
            ("pk_topics", ["workspace_id", "topic_id"]),
            ("uq_topics_workspace_slug", ["workspace_id", "slug"]),
        ],
        btree_indexes=[
            ("idx_topic_workspace_domain", ["workspace_id", "domain_id"], False),
        ],
        hnsw_embedding=True,
        rls_policies={
            "topics_workspace_isolation_policy": "false",
        },
    )


def _swap_topic_memberships() -> None:
    _swap_table(
        "topic_memberships",
        """
        workspace_id TEXT NOT NULL,
        membership_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        member_type TEXT NOT NULL,
        member_id TEXT NOT NULL,
        relevance_score FLOAT DEFAULT 1.0,
        evidence_count INT DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now()
        """,
        unique_constraints=[
            ("pk_topic_memberships", ["workspace_id", "membership_id"]),
            (
                "uq_topic_memberships_workspace_member",
                ["workspace_id", "topic_id", "member_type", "member_id"],
            ),
        ],
        rls_policies={
            "topic_memberships_workspace_isolation_policy": "false",
        },
    )


def _swap_topic_aliases() -> None:
    _swap_table(
        "topic_aliases",
        """
        workspace_id TEXT NOT NULL,
        alias_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
        """,
        unique_constraints=[
            ("pk_topic_aliases", ["workspace_id", "alias_id"]),
            (
                "uq_topic_aliases_workspace_alias",
                ["workspace_id", "topic_id", "alias"],
            ),
        ],
        rls_policies={
            "topic_aliases_workspace_isolation_policy": "false",
        },
    )


def _swap_document_revisions() -> None:
    _swap_table(
        "document_revisions",
        """
        workspace_id TEXT NOT NULL,
        revision_id UUID NOT NULL,
        source_id UUID NOT NULL,
        document_id UUID NOT NULL,
        source_external_id TEXT NOT NULL,
        source_version_key TEXT NOT NULL,
        content_checksum VARCHAR(71) NOT NULL,
        acl_checksum VARCHAR(71) NOT NULL,
        acl_scope VARCHAR(16) NOT NULL,
        acl_principal_ids JSONB NOT NULL,
        state VARCHAR(32) NOT NULL,
        base_readiness VARCHAR(16) NOT NULL,
        graph_readiness VARCHAR(16) NOT NULL,
        discovery_readiness VARCHAR(16) NOT NULL,
        readiness_reason TEXT,
        is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """,
        unique_constraints=[
            ("pk_document_revisions", ["workspace_id", "revision_id"]),
            (
                "uq_document_revisions_connector_identity",
                [
                    "workspace_id",
                    "source_id",
                    "source_external_id",
                    "source_version_key",
                ],
            ),
        ],
        check_constraints=[
            (
                "ck_document_revisions_content_checksum",
                f"content_checksum ~ '{CHECKSUM_PATTERN}'",
            ),
            (
                "ck_document_revisions_acl_checksum",
                f"acl_checksum ~ '{CHECKSUM_PATTERN}'",
            ),
            (
                "ck_document_revisions_state",
                "state IN ('staging', 'searchable', 'superseded', 'failed', 'tombstoned')",
            ),
            (
                "ck_document_revisions_base_readiness",
                "base_readiness IN ('pending', 'ready', 'failed')",
            ),
            (
                "ck_document_revisions_graph_readiness",
                "graph_readiness IN ('pending', 'ready', 'failed', 'stale')",
            ),
            (
                "ck_document_revisions_discovery_readiness",
                "discovery_readiness IN ('pending', 'ready', 'failed', 'stale')",
            ),
            (
                "ck_document_revisions_searchable_base_ready",
                "state <> 'searchable' OR base_readiness = 'ready'",
            ),
            (
                "ck_document_revisions_acl_scope",
                "acl_scope IN ('workspace', 'restricted')",
            ),
            (
                "ck_document_revisions_acl_principals",
                "jsonb_typeof(acl_principal_ids) = 'array' AND "
                "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
            ),
        ],
        btree_indexes=[
            (
                "ix_document_revisions_workspace_state",
                ["workspace_id", "state"],
                False,
            ),
        ],
        post_create_alter=[
            (
                "CREATE UNIQUE INDEX uq_document_revisions_current_document "
                "ON public.document_revisions (workspace_id, document_id) "
                "WHERE state = 'searchable'"
            ),
        ],
        app_grants="SELECT, INSERT",
        # FIX: old migration referenced non-existent columns (workflow_id,
        # status, error_code) on the new document_revisions schema.  The new
        # schema uses state / readiness columns.  Ingestion needs UPDATE on
        # all readiness columns for retry-reset flows.
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.document_revisions TO {INGESTION_ROLE}",
            (
                f"GRANT UPDATE (state, base_readiness, graph_readiness, "
                f"discovery_readiness, readiness_reason, updated_at) "
                f"ON public.document_revisions TO {INGESTION_ROLE}"
            ),
        ],
        rls_policies={
            "document_revisions_workspace_isolation_policy": (
                f"{WORKSPACE_MATCH} AND {SUBJECT_ACL}"
            ),
        },
        ingestion_policies=[
            "document_revisions_ingestion_workspace_policy",
        ],
    )
    # App role: limited UPDATE columns (from migration 0006)
    op.execute(
        f"GRANT UPDATE (state, base_readiness, graph_readiness, "
        f"discovery_readiness, readiness_reason, updated_at) "
        f"ON public.document_revisions TO {APP_ROLE}"
    )


def _swap_knowledge_domains() -> None:
    _swap_table(
        "knowledge_domains",
        """
        workspace_id VARCHAR NOT NULL,
        domain_id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        slug VARCHAR NOT NULL,
        description TEXT,
        embedding VECTOR(1024),
        source_chunk_ids JSONB DEFAULT '[]'::jsonb,
        frequency INTEGER DEFAULT 0,
        status VARCHAR NOT NULL DEFAULT 'needs_review',
        confidence FLOAT DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
        """,
        unique_constraints=[
            ("pk_knowledge_domains", ["workspace_id", "domain_id"]),
            ("idx_domain_workspace_slug", ["workspace_id", "slug"]),
        ],
        btree_indexes=[
            ("idx_domain_workspace_name", ["workspace_id", "name"], False),
        ],
        hnsw_embedding=True,
    )
    op.execute(
        f"CREATE POLICY domain_workspace_isolation ON public.knowledge_domains "
        f"USING ({WORKSPACE_MATCH}) WITH CHECK ({WORKSPACE_MATCH})"
    )


def _swap_ingestion_runs() -> None:
    _swap_table(
        "ingestion_runs",
        """
        workspace_id TEXT NOT NULL,
        run_id UUID NOT NULL,
        revision_id UUID NOT NULL,
        workflow_id TEXT,
        pipeline_version TEXT NOT NULL,
        input_checksum VARCHAR(71) NOT NULL,
        status VARCHAR(32) NOT NULL,
        error_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """,
        inline_fk_targets={
            "workspace_id, revision_id": (
                "public.document_revisions (workspace_id, revision_id) "
                "ON DELETE CASCADE"
            ),
        },
        unique_constraints=[
            ("pk_ingestion_runs", ["workspace_id", "run_id"]),
            (
                "uq_ingestion_runs_replay",
                [
                    "workspace_id",
                    "revision_id",
                    "pipeline_version",
                    "input_checksum",
                ],
            ),
        ],
        check_constraints=[
            (
                "ck_ingestion_runs_input_checksum",
                f"input_checksum ~ '{CHECKSUM_PATTERN}'",
            ),
            (
                "ck_ingestion_runs_status",
                "status IN ('pending', 'running', 'completed', 'failed', 'cancelled')",
            ),
        ],
        app_grants="SELECT, INSERT",
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.ingestion_runs TO {INGESTION_ROLE}",
            (
                f"GRANT UPDATE (workflow_id, status, error_code, updated_at) "
                f"ON public.ingestion_runs TO {INGESTION_ROLE}"
            ),
        ],
        ingestion_policies=[
            "ingestion_runs_ingestion_workspace_policy",
        ],
    )
    # App role: limited UPDATE columns (from migration 0006)
    op.execute(
        f"GRANT UPDATE (workflow_id, status, error_code, updated_at) "
        f"ON public.ingestion_runs TO {APP_ROLE}"
    )


def _swap_stage_manifests() -> None:
    _swap_table(
        "stage_manifests",
        """
        workspace_id TEXT NOT NULL,
        manifest_id UUID NOT NULL,
        ingestion_run_id UUID NOT NULL,
        stage_name TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        pipeline_version TEXT NOT NULL,
        input_checksum VARCHAR(71) NOT NULL,
        output_checksum VARCHAR(71) NOT NULL,
        item_count INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """,
        inline_fk_targets={
            "workspace_id, ingestion_run_id": (
                "public.ingestion_runs (workspace_id, run_id) ON DELETE CASCADE"
            ),
        },
        unique_constraints=[
            ("pk_stage_manifests", ["workspace_id", "manifest_id"]),
            (
                "uq_stage_manifests_batch",
                [
                    "workspace_id",
                    "ingestion_run_id",
                    "stage_name",
                    "batch_id",
                    "pipeline_version",
                ],
            ),
        ],
        check_constraints=[
            (
                "ck_stage_manifests_input_checksum",
                f"input_checksum ~ '{CHECKSUM_PATTERN}'",
            ),
            (
                "ck_stage_manifests_output_checksum",
                f"output_checksum ~ '{CHECKSUM_PATTERN}'",
            ),
            ("ck_stage_manifests_item_count", "item_count >= 0"),
        ],
        app_grants="SELECT, INSERT",
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.stage_manifests TO {INGESTION_ROLE}",
        ],
        ingestion_policies=[
            "stage_manifests_ingestion_workspace_policy",
        ],
    )


def _swap_document_sections() -> None:
    """Document sections – self-referential FK added after rename."""
    _swap_table(
        "document_sections",
        """
        workspace_id TEXT NOT NULL,
        revision_id UUID NOT NULL,
        section_id UUID NOT NULL,
        parent_section_id UUID,
        heading_path JSONB NOT NULL,
        structural_key TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        content_hash VARCHAR(71) NOT NULL
        """,
        inline_fk_targets={
            "workspace_id, revision_id": (
                "public.document_revisions (workspace_id, revision_id) "
                "ON DELETE CASCADE"
            ),
        },
        unique_constraints=[
            ("pk_document_sections", ["workspace_id", "revision_id", "section_id"]),
            (
                "uq_document_sections_structural_key",
                ["workspace_id", "revision_id", "structural_key"],
            ),
        ],
        check_constraints=[
            ("ck_document_sections_ordinal", "ordinal >= 0"),
            (
                "ck_document_sections_heading_path",
                "jsonb_typeof(heading_path) = 'array'",
            ),
            (
                "ck_document_sections_content_hash",
                f"content_hash ~ '{CHECKSUM_PATTERN}'",
            ),
        ],
        app_grants="SELECT, INSERT",
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.document_sections TO {INGESTION_ROLE}",
        ],
        ingestion_policies=[
            "document_sections_ingestion_workspace_policy",
        ],
    )
    op.execute(
        "ALTER TABLE public.document_sections ADD CONSTRAINT "
        "fk_document_sections_parent "
        "FOREIGN KEY (workspace_id, revision_id, parent_section_id) "
        "REFERENCES public.document_sections "
        "(workspace_id, revision_id, section_id) ON DELETE CASCADE"
    )


def _swap_chunks() -> None:
    _swap_table(
        "chunks",
        """
        workspace_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        text TEXT,
        token_count INT,
        embedding vector(1024),
        source_document_id TEXT,
        entity_ids JSONB,
        relation_ids JSONB,
        revision_id UUID NOT NULL,
        source_id UUID NOT NULL,
        document_id UUID NOT NULL,
        section_id UUID,
        heading_path JSONB NOT NULL,
        location_kind VARCHAR(16) NOT NULL,
        location_data JSONB NOT NULL,
        content_hash VARCHAR(71) NOT NULL,
        parser_version TEXT NOT NULL,
        chunker_version TEXT NOT NULL,
        pipeline_version TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_modified_at TIMESTAMPTZ NOT NULL,
        ingested_at TIMESTAMPTZ NOT NULL,
        acl_scope VARCHAR(16) NOT NULL,
        acl_principal_ids JSONB NOT NULL
        """,
        inline_fk_targets={
            "workspace_id, revision_id": (
                "public.document_revisions (workspace_id, revision_id) "
                "ON DELETE CASCADE"
            ),
            "workspace_id, revision_id, section_id": (
                "public.document_sections "
                "(workspace_id, revision_id, section_id)"
            ),
        },
        unique_constraints=[
            ("pk_chunks", ["workspace_id", "chunk_id"]),
            (
                "uq_chunks_workspace_revision_chunk",
                ["workspace_id", "revision_id", "chunk_id"],
            ),
        ],
        check_constraints=[
            ("ck_chunks_content_hash", f"content_hash ~ '{CHECKSUM_PATTERN}'"),
            (
                "ck_chunks_location_kind",
                "location_kind IN ('page', 'code', 'message', 'section')",
            ),
            (
                "ck_chunks_acl_scope",
                "acl_scope IN ('workspace', 'restricted')",
            ),
            (
                "ck_chunks_acl_principals",
                "jsonb_typeof(acl_principal_ids) = 'array' AND "
                "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
            ),
        ],
        btree_indexes=[
            ("ix_chunks_workspace_revision", ["workspace_id", "revision_id"], False),
        ],
        hnsw_embedding=True,
        rls_policies={
            "chunks_workspace_isolation_policy": (
                f"{WORKSPACE_MATCH} AND {SUBJECT_ACL}"
            ),
        },
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.chunks TO {INGESTION_ROLE}",
        ],
        ingestion_policies=[
            "chunks_ingestion_workspace_policy",
        ],
    )


def _swap_staged_base_chunks() -> None:
    _swap_table(
        "staged_base_chunks",
        """
        workspace_id TEXT NOT NULL,
        ingestion_run_id UUID NOT NULL,
        chunk_id TEXT NOT NULL,
        revision_id UUID NOT NULL,
        source_id UUID NOT NULL,
        document_id UUID NOT NULL,
        section_id UUID NOT NULL,
        batch_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        section_structural_key TEXT NOT NULL,
        heading_path JSONB NOT NULL,
        location_kind TEXT NOT NULL,
        location_data JSONB NOT NULL,
        text TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        embedding vector(1024),
        content_hash TEXT NOT NULL,
        parser_version TEXT NOT NULL,
        chunker_version TEXT NOT NULL,
        pipeline_version TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_modified_at TIMESTAMPTZ NOT NULL,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        acl_scope TEXT NOT NULL,
        acl_principal_ids JSONB NOT NULL DEFAULT '[]'::jsonb
        """,
        inline_fk_targets={
            "workspace_id, ingestion_run_id": (
                "public.ingestion_runs (workspace_id, run_id) ON DELETE CASCADE"
            ),
            "workspace_id, revision_id": (
                "public.document_revisions (workspace_id, revision_id) "
                "ON DELETE CASCADE"
            ),
        },
        unique_constraints=[
            (
                "pk_staged_base_chunks",
                ["workspace_id", "ingestion_run_id", "chunk_id"],
            ),
            (
                "uq_staged_base_chunks_batch_ordinal",
                ["workspace_id", "ingestion_run_id", "batch_id", "ordinal"],
            ),
        ],
        check_constraints=[
            ("ck_staged_base_chunks_ordinal", "ordinal >= 0"),
            ("ck_staged_base_chunks_tokens", "token_count > 0"),
            (
                "ck_staged_base_chunks_content_hash",
                f"content_hash ~ '{CHECKSUM_PATTERN}'",
            ),
            (
                "ck_staged_base_chunks_location_kind",
                "location_kind IN ('page', 'code', 'message', 'section')",
            ),
            (
                "ck_staged_base_chunks_acl_scope",
                "acl_scope IN ('workspace', 'restricted')",
            ),
            (
                "ck_staged_base_chunks_acl_principals",
                "jsonb_typeof(acl_principal_ids) = 'array' AND "
                "(acl_scope = 'workspace' OR jsonb_array_length(acl_principal_ids) > 0)",
            ),
        ],
        btree_indexes=[
            (
                "ix_staged_base_chunks_run_batch",
                ["workspace_id", "ingestion_run_id", "batch_id"],
                False,
            ),
        ],
        hnsw_embedding=True,
        app_grants=None,
        rls_policies={},
        ingestion_grants=[
            f"GRANT SELECT, INSERT ON public.staged_base_chunks TO {INGESTION_ROLE}",
            f"GRANT UPDATE (embedding) ON public.staged_base_chunks TO {INGESTION_ROLE}",
        ],
        ingestion_policies=[
            "staged_base_chunks_ingestion_workspace_policy",
        ],
    )


# ---------------------------------------------------------------------------
# ACL expression builders (replicated from migration 0005)
# ---------------------------------------------------------------------------

def _aggregate_chunk_acl(table: str) -> str:
    return (
        f"{table}.workspace_id = current_setting('app.current_workspace_id', true) "
        f"AND jsonb_typeof({table}.source_chunk_ids) = 'array' "
        f"AND jsonb_array_length({table}.source_chunk_ids) > 0 "
        "AND NOT EXISTS ("
        f"SELECT 1 FROM jsonb_array_elements_text({table}.source_chunk_ids) "
        "AS source(chunk_id) "
        "WHERE NOT EXISTS (SELECT 1 FROM public.chunks AS chunk "
        f"WHERE chunk.workspace_id = {table}.workspace_id "
        "AND chunk.chunk_id = source.chunk_id))"
    )
