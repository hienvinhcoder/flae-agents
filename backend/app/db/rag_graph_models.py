"""SQLAlchemy records for immutable resolution, projection, and snapshot versions."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKeyConstraint, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.rag_models import RagBase


class EntityResolutionRunRecord(RagBase):
    __tablename__ = "entity_resolution_runs"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    resolution_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    resolver_version: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    mapping_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    predecessor_run_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True))
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CanonicalEntityVersionRecord(RagBase):
    __tablename__ = "canonical_entity_versions"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "resolution_run_id"),
            ("entity_resolution_runs.workspace_id", "entity_resolution_runs.resolution_run_id"),
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    resolution_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    canonical_entity_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    canonical_name: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    external_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    disambiguation_attributes: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, nullable=False)


class EntityResolutionAssignmentRecord(RagBase):
    __tablename__ = "entity_resolution_assignments"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    resolution_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    observation_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    canonical_entity_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True))
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)


class EntityResolutionLineageRecord(RagBase):
    __tablename__ = "entity_resolution_lineage"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    resolution_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    lineage_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    predecessor_run_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True))
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    from_entity_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    to_entity_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    observation_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)


class RelationshipProjectionVersionRecord(RagBase):
    __tablename__ = "relationship_projection_versions"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    projection_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    resolution_run_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    projection_version: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    revision_set_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    projection_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CanonicalRelationshipVersionRecord(RagBase):
    __tablename__ = "canonical_relationship_versions"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    projection_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    relationship_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    subject_entity_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    predicate: Mapped[str] = mapped_column(Text, nullable=False)
    object_entity_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True))
    object_value: Mapped[str | None] = mapped_column(Text)
    polarity: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    frequency: Mapped[int] = mapped_column(Integer, nullable=False)
    assertion_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    chunk_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    revision_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)


class GraphMappingRecord(RagBase):
    __tablename__ = "graph_mappings"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    projection_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    mapping_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    chunk_id: Mapped[str] = mapped_column(Text, nullable=False)
    assertion_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    target_kind: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)


class GraphSnapshotRecord(RagBase):
    __tablename__ = "graph_snapshots"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    snapshot_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    projection_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    resolution_run_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    revision_set_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    graph_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GraphSnapshotRevisionRecord(RagBase):
    __tablename__ = "graph_snapshot_revisions"

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    snapshot_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    content_checksum: Mapped[str] = mapped_column(Text, nullable=False)
    acl_checksum: Mapped[str] = mapped_column(Text, nullable=False)
