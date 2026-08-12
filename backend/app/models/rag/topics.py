import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import String, Float, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.core.config import settings
from app.models.rag.records import RagBase


class Topic(RagBase):
    __tablename__ = "topics"

    workspace_id: Mapped[str] = mapped_column(String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(String, primary_key=True)
    parent_topic_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # 'domain' | 'topic' | 'subtopic'
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)  # 'active' | 'archived' | 'needs_review'
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


class TopicMembership(RagBase):
    __tablename__ = "topic_memberships"

    workspace_id: Mapped[str] = mapped_column(String, primary_key=True)
    membership_id: Mapped[str] = mapped_column(String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(String, nullable=False)
    member_type: Mapped[str] = mapped_column(String, nullable=False)  # 'chunk' | 'document' | 'entity' | 'relationship' ...
    member_id: Mapped[str] = mapped_column(String, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    evidence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active", nullable=False)  # 'active' | 'inactive'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TopicAlias(RagBase):
    __tablename__ = "topic_aliases"

    workspace_id: Mapped[str] = mapped_column(String, primary_key=True)
    alias_id: Mapped[str] = mapped_column(String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(String, nullable=False)
    alias: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TopicUpdateQueue(RagBase):
    __tablename__ = "topic_update_queue"

    workspace_id: Mapped[str] = mapped_column(String, primary_key=True)
    queue_id: Mapped[str] = mapped_column(String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(String, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_member_ids: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)  # 'pending' | 'processing' | 'completed' | 'failed'
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
