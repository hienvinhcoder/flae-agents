"""SQLAlchemy record for revision-scoped base-ingestion staging."""

from datetime import datetime
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.rag.records import RagBase


class StagedBaseChunkRecord(RagBase):
    __tablename__ = "staged_base_chunks"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "ingestion_run_id"),
            ("ingestion_runs.workspace_id", "ingestion_runs.run_id"),
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "ingestion_run_id",
            "batch_id",
            "ordinal",
            name="uq_staged_base_chunks_batch_ordinal",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    ingestion_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    chunk_id: Mapped[str] = mapped_column(Text, primary_key=True)
    revision_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True))
    source_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True))
    document_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True))
    section_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True))
    batch_id: Mapped[str] = mapped_column(Text)
    ordinal: Mapped[int] = mapped_column(Integer)
    section_structural_key: Mapped[str] = mapped_column(Text)
    heading_path: Mapped[list[str]] = mapped_column(JSONB)
    location_kind: Mapped[str] = mapped_column(Text)
    location_data: Mapped[dict[str, object]] = mapped_column(JSONB)
    text: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    content_hash: Mapped[str] = mapped_column(Text)
    parser_version: Mapped[str] = mapped_column(Text)
    chunker_version: Mapped[str] = mapped_column(Text)
    pipeline_version: Mapped[str] = mapped_column(Text)
    source_name: Mapped[str] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(Text)
    source_modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    acl_scope: Mapped[str] = mapped_column(Text)
    acl_principal_ids: Mapped[list[str]] = mapped_column(JSONB)
