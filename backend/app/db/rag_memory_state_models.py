"""SQLAlchemy records for memory-state rules and immutable projections."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.rag_models import RagBase


class MemoryStateRuleRecord(RagBase):
    __tablename__ = "memory_state_rules"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    rule_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    subject_entity_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    predicate: Mapped[str] = mapped_column(Text, nullable=False)
    required_polarities: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    minimum_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    stale_after_seconds: Mapped[int | None] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class MemoryStateProjectionRecord(RagBase):
    __tablename__ = "memory_state_projections"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    projection_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    graph_snapshot_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    revision_set_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    projection_version: Mapped[str] = mapped_column(Text, nullable=False)
    projection_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    change_count: Mapped[int] = mapped_column(Integer, nullable=False)
    contradiction_count: Mapped[int] = mapped_column(Integer, nullable=False)
    gap_count: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
