"""add knowledge_domains and topics.domain_id

Revision ID: rag_0020
Revises: rag_0019
Create Date: 2026-08-18
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa


revision: str = "rag_0020"
down_revision: str | Sequence[str] | None = "rag_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "flae_rag_app"


def upgrade() -> None:
    # 1. knowledge_domains table
    op.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_domains (
            workspace_id VARCHAR NOT NULL,
            domain_id    VARCHAR NOT NULL,
            name         VARCHAR NOT NULL,
            slug         VARCHAR NOT NULL,
            description  TEXT,
            embedding    VECTOR(1024),
            source_chunk_ids JSONB DEFAULT '[]'::jsonb,
            frequency    INTEGER DEFAULT 0,
            status       VARCHAR NOT NULL DEFAULT 'needs_review',
            confidence   FLOAT DEFAULT 1.0,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            updated_at   TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (workspace_id, domain_id)
        );
    """)
    op.create_index(
        "idx_domain_workspace_slug",
        "knowledge_domains",
        ["workspace_id", "slug"],
        unique=True,
    )
    op.create_index(
        "idx_domain_workspace_name",
        "knowledge_domains",
        ["workspace_id", "name"],
    )

    # 2. topics.domain_id
    op.add_column(
        "topics",
        sa.Column("domain_id", sa.String, nullable=True),
    )
    op.create_index(
        "idx_topic_workspace_domain",
        "topics",
        ["workspace_id", "domain_id"],
    )

    # 3. domain_update_queue
    op.execute("""
        CREATE TABLE IF NOT EXISTS domain_update_queue (
            workspace_id VARCHAR NOT NULL,
            queue_id     VARCHAR NOT NULL,
            domain_id    VARCHAR NOT NULL,
            reason       TEXT,
            status       VARCHAR NOT NULL DEFAULT 'pending',
            scheduled_at TIMESTAMPTZ,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (workspace_id, queue_id)
        );
    """)

    # 4. RLS
    op.execute("""
        ALTER TABLE knowledge_domains ENABLE ROW LEVEL SECURITY;
    """)
    op.execute(f"""
        CREATE POLICY domain_workspace_isolation ON knowledge_domains
            USING (workspace_id = current_setting('app.current_workspace_id', true));
    """)
    op.execute(f"""
        ALTER TABLE knowledge_domains FORCE ROW LEVEL SECURITY;
    """)
    op.execute(f"""
        GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_domains TO {APP_ROLE};
    """)


def downgrade() -> None:
    op.drop_table("domain_update_queue")
    op.drop_index("idx_topic_workspace_domain", table_name="topics")
    op.drop_column(table_name="topics", column_name="domain_id")
    op.drop_index("idx_domain_workspace_name", table_name="knowledge_domains")
    op.drop_index("idx_domain_workspace_slug", table_name="knowledge_domains")
    op.drop_table("knowledge_domains")
