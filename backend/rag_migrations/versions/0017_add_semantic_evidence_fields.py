"""add source-backed semantic evidence fields

Revision ID: rag_0017
Revises: rag_0016
Create Date: 2026-08-03
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0017"
down_revision: str | Sequence[str] | None = "rag_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "entity_observations",
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "assertion_evidence",
        sa.Column(
            "keywords",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "assertion_evidence",
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
    )
    op.alter_column("entity_observations", "description", server_default=None)
    op.alter_column("assertion_evidence", "keywords", server_default=None)
    op.alter_column("assertion_evidence", "description", server_default=None)


def downgrade() -> None:
    op.drop_column("assertion_evidence", "description")
    op.drop_column("assertion_evidence", "keywords")
    op.drop_column("entity_observations", "description")
