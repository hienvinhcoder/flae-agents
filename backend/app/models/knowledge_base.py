import uuid
from enum import Enum
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class DocumentStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DocumentType(str, Enum):
    pdf = "pdf"
    markdown = "markdown"
    text = "text"
    manual_input = "manual_input"


class KnowledgeDocument(BaseModel):
    """
    Metadata của tài liệu trong Knowledge Base.
    Lưu trong flae_db, dữ liệu RAG thực tế (chunks/entities/relationships)
    lưu riêng trong rag_db và được liên kết qua document_id.
    """
    __tablename__ = "knowledge_documents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType), nullable=False
    )

    # --- File info (null nếu manual_input) ---
    file_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gcs_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # --- Manual input content (null nếu file upload) ---
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # --- Ingestion status ---
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus),
        default=DocumentStatus.pending,
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    temporal_workflow_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # --- Ingestion metrics ---
    chunk_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    entity_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    relation_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_usage: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    processing_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    # --- Owner ---
    uploaded_by: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.firebase_uid", ondelete="CASCADE"),
        nullable=False,
    )
