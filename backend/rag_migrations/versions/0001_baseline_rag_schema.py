"""baseline rag schema

Revision ID: rag_0001
Revises:
Create Date: 2026-07-29
"""

from typing import Sequence

from alembic import op


revision: str = "rag_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"
TABLES = (
    "chunks",
    "entities",
    "relationships",
    "topics",
    "topic_memberships",
    "topic_aliases",
    "topic_update_queue",
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        f"""
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
            CREATE ROLE {APP_ROLE}
              NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
          END IF;
        END $$;
        """
    )
    op.execute(f"GRANT {APP_ROLE} TO CURRENT_USER")
    for statement in _table_statements():
        op.execute(statement)
    for statement in _legacy_upgrade_statements():
        op.execute(statement)
    for table in TABLES:
        policy_name = f"{table}_workspace_isolation_policy"
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
        op.execute(f"DROP POLICY IF EXISTS {policy_name} ON public.{table}")
        op.execute(
            f"CREATE POLICY {policy_name} ON public.{table} "
            f"FOR ALL TO {APP_ROLE} "
            "USING (workspace_id = current_setting('app.current_workspace_id', true)) "
            "WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true))"
        )
        op.execute(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO {APP_ROLE}"
        )
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE}")


def downgrade() -> None:
    for table in reversed(TABLES):
        op.execute(f"DROP TABLE IF EXISTS public.{table} CASCADE")
    op.execute(f"REVOKE {APP_ROLE} FROM CURRENT_USER")
    op.execute(f"DROP ROLE IF EXISTS {APP_ROLE}")


def _table_statements() -> tuple[str, ...]:
    return (
        """CREATE TABLE IF NOT EXISTS public.chunks (
      workspace_id TEXT NOT NULL, chunk_id TEXT NOT NULL, text TEXT,
      token_count INT, embedding vector(1024), source_document_id TEXT,
      entity_ids JSONB, relation_ids JSONB,
      PRIMARY KEY (workspace_id, chunk_id)
    )""",
        """CREATE TABLE IF NOT EXISTS public.entities (
      workspace_id TEXT NOT NULL, entity_id TEXT NOT NULL, entity_name TEXT,
      entity_type TEXT, description TEXT, source_chunk_ids JSONB,
      chunk_descriptions JSONB, degree INT, frequency INT,
      embedding vector(1024), PRIMARY KEY (workspace_id, entity_id)
    )""",
        """CREATE TABLE IF NOT EXISTS public.relationships (
      workspace_id TEXT NOT NULL, relation_id TEXT NOT NULL, source_id TEXT,
      source_name TEXT, target_id TEXT, target_name TEXT, keywords TEXT,
      description TEXT, source_chunk_ids JSONB, chunk_meta JSONB,
      frequency INT, degree INT, embedding vector(1024),
      PRIMARY KEY (workspace_id, relation_id)
    )""",
        """CREATE TABLE IF NOT EXISTS public.topics (
      workspace_id TEXT NOT NULL, topic_id TEXT NOT NULL, parent_topic_id TEXT,
      name TEXT NOT NULL, slug TEXT NOT NULL, type TEXT NOT NULL, summary TEXT,
      current_state TEXT, status TEXT NOT NULL, confidence FLOAT DEFAULT 1.0,
      embedding vector(1024), created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (workspace_id, topic_id),
      CONSTRAINT uq_topics_workspace_slug UNIQUE (workspace_id, slug)
    )""",
        """CREATE TABLE IF NOT EXISTS public.topic_memberships (
      workspace_id TEXT NOT NULL, membership_id TEXT NOT NULL, topic_id TEXT NOT NULL,
      member_type TEXT NOT NULL, member_id TEXT NOT NULL, relevance_score FLOAT DEFAULT 1.0,
      evidence_count INT DEFAULT 1, status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (workspace_id, membership_id),
      CONSTRAINT uq_topic_memberships_workspace_member
        UNIQUE (workspace_id, topic_id, member_type, member_id)
    )""",
        """CREATE TABLE IF NOT EXISTS public.topic_aliases (
      workspace_id TEXT NOT NULL, alias_id TEXT NOT NULL, topic_id TEXT NOT NULL,
      alias TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (workspace_id, alias_id),
      CONSTRAINT uq_topic_aliases_workspace_alias UNIQUE (workspace_id, topic_id, alias)
    )""",
        """CREATE TABLE IF NOT EXISTS public.topic_update_queue (
      workspace_id TEXT NOT NULL, queue_id TEXT NOT NULL, topic_id TEXT NOT NULL,
      reason TEXT, changed_member_ids JSONB, status TEXT NOT NULL,
      scheduled_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (workspace_id, queue_id)
    )""",
    )


def _legacy_upgrade_statements() -> tuple[str, ...]:
    statements: list[str] = []
    for table in TABLES:
        statements.append(
            f"""
            DO $$ BEGIN
              IF EXISTS (
                SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relname = '{table}' AND c.relkind = 'p'
              ) THEN
                EXECUTE 'CREATE TABLE IF NOT EXISTS public.{table}_default '
                        'PARTITION OF public.{table} DEFAULT';
              END IF;
            END $$;
            """
        )
    statements.extend(
        (
            "ALTER TABLE public.entities "
            "ADD COLUMN IF NOT EXISTS chunk_descriptions JSONB",
            "ALTER TABLE public.relationships "
            "ADD COLUMN IF NOT EXISTS chunk_meta JSONB",
        )
    )
    return tuple(statements)
