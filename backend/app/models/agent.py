import uuid
from typing import Optional
from sqlalchemy import String, Text, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Agent(BaseModel):
    """
    Model quản lý cấu hình của Agent trong Workspace.
    """
    __tablename__ = "agents"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(100), nullable=False)  # Mã màu ví dụ: bg-blue-500
    avatar_icon: Mapped[str] = mapped_column(String(100), nullable=False)   # Tên Lucide icon ví dụ: bot
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.5-flash", nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.2, nullable=False)
    created_by: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.firebase_uid", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)



class ChatSession(BaseModel):
    """
    Model quản lý phiên hội thoại giữa User và Agent.
    """
    __tablename__ = "chat_sessions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), default="Cuộc hội thoại mới", nullable=False)
    created_by: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.firebase_uid", ondelete="CASCADE"),
        nullable=False,
    )


class ChatMessage(BaseModel):
    """
    Model lưu lịch sử tin nhắn trong ChatSession để phục vụ việc hiển thị nhanh trên UI.
    """
    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user hoặc assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # Danh sách nguồn tài liệu trích dẫn
    created_by: Mapped[str] = mapped_column(String, nullable=False)  # Firebase UID hoặc "assistant"
