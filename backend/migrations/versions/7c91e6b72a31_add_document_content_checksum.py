"""add document content checksum for reference-only ingestion

Revision ID: 7c91e6b72a31
Revises: 2134c480e33b
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "7c91e6b72a31"
down_revision: str | Sequence[str] | None = "2134c480e33b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "knowledge_documents",
        sa.Column("content_checksum", sa.String(length=71), nullable=True),
    )
    op.create_check_constraint(
        "ck_knowledge_documents_content_checksum",
        "knowledge_documents",
        "content_checksum IS NULL OR "
        "content_checksum ~ '^sha256:[0-9a-f]{64}$'",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_knowledge_documents_content_checksum",
        "knowledge_documents",
        type_="check",
    )
    op.drop_column("knowledge_documents", "content_checksum")
