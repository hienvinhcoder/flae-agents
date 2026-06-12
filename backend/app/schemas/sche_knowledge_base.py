import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.knowledge_base import DocumentStatus, DocumentType


# ── Request Schemas ──────────────────────────────────────────────


class ManualDocumentCreate(BaseModel):
    """Payload khi người dùng nhập text/markdown trực tiếp."""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    content_text: str = Field(..., min_length=1)


class IngestionConfigOverride(BaseModel):
    """Override cấu hình ingestion cho từng document (optional)."""
    chunking_strategy: str = Field(default_factory=lambda: settings.RAG_CHUNKING_STRATEGY)
    chunk_size: int = Field(default_factory=lambda: settings.RAG_FIXED_SIZE)
    chunk_overlap: int = Field(default_factory=lambda: settings.RAG_FIXED_OVERLAP)
    enable_entity_extraction: bool = True


# ── Response Schemas ─────────────────────────────────────────────


class DocumentUploadResponse(BaseModel):
    """Response sau khi upload thành công."""
    id: uuid.UUID
    title: str
    status: DocumentStatus
    temporal_workflow_id: Optional[str] = None


class DocumentListItem(BaseModel):
    """Item trong danh sách documents."""
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    status: DocumentStatus
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    chunk_count: Optional[int] = None
    entity_count: Optional[int] = None
    relation_count: Optional[int] = None
    uploaded_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetail(DocumentListItem):
    """Chi tiết document bao gồm ingestion metrics."""
    content_text: Optional[str] = None
    error_message: Optional[str] = None
    token_usage: Optional[dict] = None
    processing_time_seconds: Optional[float] = None
    temporal_workflow_id: Optional[str] = None
    gcs_path: Optional[str] = None
    mime_type: Optional[str] = None


class IngestionStatusResponse(BaseModel):
    """Response cho endpoint check status."""
    document_id: uuid.UUID
    status: DocumentStatus
    error_message: Optional[str] = None
    chunk_count: Optional[int] = None
    entity_count: Optional[int] = None
    relation_count: Optional[int] = None
    processing_time_seconds: Optional[float] = None


# ── Knowledge Graph Schemas ──────────────────────────────────────────


class GraphNode(BaseModel):
    """Schema biểu diễn một thực thể (Node) trên đồ thị."""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    frequency: int = 1
    degree: int = 0


class GraphEdge(BaseModel):
    """Schema biểu diễn một quan hệ (Edge/Link) trên đồ thị."""
    id: str
    source: str
    target: str
    label: Optional[str] = None
    description: Optional[str] = None
    weight: int = 1


class KnowledgeGraphResponse(BaseModel):
    """Response chứa cấu trúc Graph đầy đủ."""
    nodes: list[GraphNode]
    edges: list[GraphEdge]

