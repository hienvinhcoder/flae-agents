"""add immutable entity observations and assertion evidence

Revision ID: rag_0004
Revises: rag_0003
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rag_0004"
down_revision: str | Sequence[str] | None = "rag_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CHECKSUM_PATTERN = r"^sha256:[0-9a-f]{64}$"


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_chunks_workspace_revision_chunk",
        "chunks",
        ("workspace_id", "revision_id", "chunk_id"),
    )
    op.create_table(
        "entity_observations",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("observation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column("raw_mention", sa.Text(), nullable=False),
        sa.Column("normalized_mention", sa.Text(), nullable=False),
        sa.Column("proposed_type", sa.Text(), nullable=False),
        sa.Column("evidence_start", sa.Integer(), nullable=False),
        sa.Column("evidence_end", sa.Integer(), nullable=False),
        sa.Column("extractor_version", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column(
            "external_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "disambiguation_attributes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("canonical_entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolver_version", sa.Text(), nullable=True),
        sa.Column("resolver_confidence", sa.Float(), nullable=True),
        sa.Column("evidence_key", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("workspace_id", "observation_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id"),
            ("chunks.workspace_id", "chunks.revision_id", "chunks.chunk_id"),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "evidence_key",
            name="uq_entity_observations_evidence_key",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "chunk_id",
            "observation_id",
            name="uq_entity_observations_chunk_identity",
        ),
        sa.CheckConstraint(
            "evidence_start >= 0 AND evidence_end > evidence_start",
            name="ck_entity_observations_span",
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_entity_observations_confidence",
        ),
        sa.CheckConstraint(
            "resolver_confidence IS NULL OR "
            "(resolver_confidence >= 0 AND resolver_confidence <= 1)",
            name="ck_entity_observations_resolver_confidence",
        ),
        sa.CheckConstraint(
            "(canonical_entity_id IS NULL AND resolver_version IS NULL AND "
            "resolver_confidence IS NULL) OR "
            "(canonical_entity_id IS NOT NULL AND resolver_version IS NOT NULL AND "
            "resolver_confidence IS NOT NULL)",
            name="ck_entity_observations_resolution_complete",
        ),
        sa.CheckConstraint(
            f"evidence_key ~ '{CHECKSUM_PATTERN}'",
            name="ck_entity_observations_evidence_key",
        ),
    )

    op.create_table(
        "assertion_evidence",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("assertion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", sa.Text(), nullable=False),
        sa.Column(
            "subject_observation_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("predicate", sa.Text(), nullable=False),
        sa.Column("object_observation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("object_value", sa.Text(), nullable=True),
        sa.Column("polarity", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_start", sa.Integer(), nullable=False),
        sa.Column("evidence_end", sa.Integer(), nullable=False),
        sa.Column("extractor_version", sa.Text(), nullable=False),
        sa.Column("evidence_key", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("workspace_id", "assertion_id"),
        sa.ForeignKeyConstraint(
            (
                "workspace_id",
                "revision_id",
                "chunk_id",
                "subject_observation_id",
            ),
            (
                "entity_observations.workspace_id",
                "entity_observations.revision_id",
                "entity_observations.chunk_id",
                "entity_observations.observation_id",
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            (
                "workspace_id",
                "revision_id",
                "chunk_id",
                "object_observation_id",
            ),
            (
                "entity_observations.workspace_id",
                "entity_observations.revision_id",
                "entity_observations.chunk_id",
                "entity_observations.observation_id",
            ),
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "evidence_key",
            name="uq_assertion_evidence_key",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "revision_id",
            "assertion_id",
            name="uq_assertion_evidence_revision_identity",
        ),
        sa.CheckConstraint(
            "(object_observation_id IS NULL) <> (object_value IS NULL)",
            name="ck_assertion_evidence_exactly_one_object",
        ),
        sa.CheckConstraint(
            "evidence_start >= 0 AND evidence_end > evidence_start",
            name="ck_assertion_evidence_span",
        ),
        sa.CheckConstraint(
            "valid_from IS NULL OR valid_to IS NULL OR valid_to > valid_from",
            name="ck_assertion_evidence_validity",
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_assertion_evidence_confidence",
        ),
        sa.CheckConstraint(
            "polarity IN ('affirmed', 'negated', 'uncertain')",
            name="ck_assertion_evidence_polarity",
        ),
        sa.CheckConstraint(
            f"evidence_key ~ '{CHECKSUM_PATTERN}'",
            name="ck_assertion_evidence_key",
        ),
    )

    op.create_table(
        "assertion_qualifiers",
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("qualifier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assertion_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("text_value", sa.Text(), nullable=True),
        sa.Column("integer_value", sa.BigInteger(), nullable=True),
        sa.Column("number_value", sa.Float(), nullable=True),
        sa.Column("boolean_value", sa.Boolean(), nullable=True),
        sa.Column("datetime_value", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("workspace_id", "qualifier_id"),
        sa.ForeignKeyConstraint(
            ("workspace_id", "revision_id", "assertion_id"),
            (
                "assertion_evidence.workspace_id",
                "assertion_evidence.revision_id",
                "assertion_evidence.assertion_id",
            ),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "num_nonnulls(text_value, integer_value, number_value, boolean_value, "
            "datetime_value) = 1",
            name="ck_assertion_qualifiers_exactly_one_value",
        ),
    )

    for table in ("entity_observations", "assertion_evidence"):
        op.create_index(
            f"ix_{table}_workspace_revision_chunk",
            table,
            ("workspace_id", "revision_id", "chunk_id"),
        )


def downgrade() -> None:
    op.drop_index(
        "ix_assertion_evidence_workspace_revision_chunk",
        table_name="assertion_evidence",
    )
    op.drop_index(
        "ix_entity_observations_workspace_revision_chunk",
        table_name="entity_observations",
    )
    op.drop_table("assertion_qualifiers")
    op.drop_table("assertion_evidence")
    op.drop_table("entity_observations")
    op.drop_constraint(
        "uq_chunks_workspace_revision_chunk", "chunks", type_="unique"
    )
