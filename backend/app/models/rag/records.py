"""SQLAlchemy records owned by the revisioned RAG database."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from pgvector.sqlalchemy import Vector


class RagBase(DeclarativeBase):
    pass


class DocumentRevisionRecord(RagBase):
    __tablename__ = "document_revisions"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "source_id",
            "source_external_id",
            "source_version_key",
            name="uq_document_revisions_connector_identity",
        ),
        CheckConstraint(
            "state <> 'searchable' OR base_readiness = 'ready'",
            name="ck_document_revisions_searchable_base_ready",
        ),
        Index(
            "uq_document_revisions_current_document",
            "workspace_id",
            "document_id",
            unique=True,
            postgresql_where=text("state = 'searchable'"),
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    source_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    source_external_id: Mapped[str] = mapped_column(Text, nullable=False)
    source_version_key: Mapped[str] = mapped_column(Text, nullable=False)
    content_checksum: Mapped[str] = mapped_column(String(71), nullable=False)
    acl_checksum: Mapped[str] = mapped_column(String(71), nullable=False)
    acl_scope: Mapped[str] = mapped_column(String(16), nullable=False)
    acl_principal_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    base_readiness: Mapped[str] = mapped_column(String(16), nullable=False)
    graph_readiness: Mapped[str] = mapped_column(String(16), nullable=False)
    discovery_readiness: Mapped[str] = mapped_column(String(16), nullable=False)
    readiness_reason: Mapped[str | None] = mapped_column(Text)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class IngestionRunRecord(RagBase):
    __tablename__ = "ingestion_runs"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            (
                "document_revisions.workspace_id",
                "document_revisions.revision_id",
            ),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "pipeline_version",
            "input_checksum",
            name="uq_ingestion_runs_replay",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    workflow_id: Mapped[str | None] = mapped_column(Text)
    pipeline_version: Mapped[str] = mapped_column(Text, nullable=False)
    input_checksum: Mapped[str] = mapped_column(String(71), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    error_code: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class StageManifestRecord(RagBase):
    __tablename__ = "stage_manifests"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "ingestion_run_id"),
            ("ingestion_runs.workspace_id", "ingestion_runs.run_id"),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "ingestion_run_id",
            "stage_name",
            "batch_id",
            "pipeline_version",
            name="uq_stage_manifests_batch",
        ),
        CheckConstraint("item_count >= 0", name="ck_stage_manifests_item_count"),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    manifest_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    ingestion_run_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    stage_name: Mapped[str] = mapped_column(Text, nullable=False)
    batch_id: Mapped[str] = mapped_column(Text, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(Text, nullable=False)
    input_checksum: Mapped[str] = mapped_column(String(71), nullable=False)
    output_checksum: Mapped[str] = mapped_column(String(71), nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class DocumentSectionRecord(RagBase):
    __tablename__ = "document_sections"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "parent_section_id"),
            (
                "document_sections.workspace_id",
                "document_sections.revision_id",
                "document_sections.section_id",
            ),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "structural_key",
            name="uq_document_sections_structural_key",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    section_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    parent_section_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True)
    )
    heading_path: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    structural_key: Mapped[str] = mapped_column(Text, nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(71), nullable=False)


class ChunkRecord(RagBase):
    __tablename__ = "chunks"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "chunk_id",
            name="uq_chunks_workspace_revision_chunk",
        ),
        ForeignKeyConstraint(
            ("workspace_id", "revision_id"),
            ("document_revisions.workspace_id", "document_revisions.revision_id"),
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "section_id"),
            (
                "document_sections.workspace_id",
                "document_sections.revision_id",
                "document_sections.section_id",
            ),
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    chunk_id: Mapped[str] = mapped_column(Text, primary_key=True)
    text: Mapped[str | None] = mapped_column(Text)
    token_count: Mapped[int | None] = mapped_column(Integer)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    source_document_id: Mapped[str | None] = mapped_column(Text)
    entity_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    relation_ids: Mapped[list[str] | None] = mapped_column(JSONB)
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    source_id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    section_id: Mapped[UUID | None] = mapped_column(PostgreSQLUUID(as_uuid=True))
    heading_path: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    location_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    location_data: Mapped[dict[str, str | int | list[str]]] = mapped_column(
        JSONB, nullable=False
    )
    content_hash: Mapped[str] = mapped_column(String(71), nullable=False)
    parser_version: Mapped[str] = mapped_column(Text, nullable=False)
    chunker_version: Mapped[str] = mapped_column(Text, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_modified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    acl_scope: Mapped[str] = mapped_column(String(16), nullable=False)
    acl_principal_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)


class EntityObservationRecord(RagBase):
    __tablename__ = "entity_observations"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id"),
            ("chunks.workspace_id", "chunks.revision_id", "chunks.chunk_id"),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "evidence_key",
            name="uq_entity_observations_evidence_key",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "chunk_id",
            "observation_id",
            name="uq_entity_observations_chunk_identity",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    observation_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    chunk_id: Mapped[str] = mapped_column(Text, nullable=False)
    raw_mention: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_mention: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_type: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_start: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_end: Mapped[int] = mapped_column(Integer, nullable=False)
    extractor_version: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    external_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    disambiguation_attributes: Mapped[list[dict[str, str]]] = mapped_column(
        JSONB, nullable=False
    )
    canonical_entity_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True)
    )
    resolver_version: Mapped[str | None] = mapped_column(Text)
    resolver_confidence: Mapped[float | None] = mapped_column()
    evidence_key: Mapped[str] = mapped_column(String(71), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class AssertionEvidenceRecord(RagBase):
    __tablename__ = "assertion_evidence"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id", "subject_observation_id"),
            (
                "entity_observations.workspace_id",
                "entity_observations.revision_id",
                "entity_observations.chunk_id",
                "entity_observations.observation_id",
            ),
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "chunk_id", "object_observation_id"),
            (
                "entity_observations.workspace_id",
                "entity_observations.revision_id",
                "entity_observations.chunk_id",
                "entity_observations.observation_id",
            ),
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "evidence_key",
            name="uq_assertion_evidence_key",
        ),
        UniqueConstraint(
            "workspace_id",
            "revision_id",
            "assertion_id",
            name="uq_assertion_evidence_revision_identity",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    assertion_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    chunk_id: Mapped[str] = mapped_column(Text, nullable=False)
    subject_observation_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    predicate: Mapped[str] = mapped_column(Text, nullable=False)
    object_observation_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True)
    )
    object_value: Mapped[str | None] = mapped_column(Text)
    polarity: Mapped[str] = mapped_column(String(16), nullable=False)
    confidence: Mapped[float] = mapped_column(nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    evidence_start: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_end: Mapped[int] = mapped_column(Integer, nullable=False)
    extractor_version: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_key: Mapped[str] = mapped_column(String(71), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class AssertionQualifierRecord(RagBase):
    __tablename__ = "assertion_qualifiers"
    __table_args__ = (
        ForeignKeyConstraint(
            ("workspace_id", "revision_id", "assertion_id"),
            (
                "assertion_evidence.workspace_id",
                "assertion_evidence.revision_id",
                "assertion_evidence.assertion_id",
            ),
            ondelete="CASCADE",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(Text, primary_key=True)
    qualifier_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True
    )
    revision_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    assertion_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    text_value: Mapped[str | None] = mapped_column(Text)
    integer_value: Mapped[int | None] = mapped_column()
    number_value: Mapped[float | None] = mapped_column()
    boolean_value: Mapped[bool | None] = mapped_column(Boolean)
    datetime_value: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    unit: Mapped[str | None] = mapped_column(Text)


# Register graph-version tables on the same RAG metadata without growing this file.
from app.models.rag import graph as _graph  # noqa: E402,F401
from app.models.rag import memory_state as _memory_state  # noqa: E402,F401
