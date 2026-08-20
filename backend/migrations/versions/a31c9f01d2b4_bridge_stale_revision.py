"""bridge stale revision a31c9f01d2b4

Revision ID: a31c9f01d2b4
Revises: 7c91e6b72a31
Create Date: 2026-08-18
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a31c9f01d2b4"
down_revision: str | Sequence[str] | None = "7c91e6b72a31"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """No-op: bridges a stale revision left in some databases."""
    pass


def downgrade() -> None:
    pass
