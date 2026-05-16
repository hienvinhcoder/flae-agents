from enum import Enum
from typing import Optional, Any
from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class PlatformEnum(str, Enum):
    manual = "manual"
    haravan = "haravan"
    kiotviet = "kiotviet"

class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"

class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String)
    industry: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    platform: Mapped[PlatformEnum] = mapped_column(SQLEnum(PlatformEnum), default=PlatformEnum.manual)
    platform_store_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    owner_uid: Mapped[str] = mapped_column(String, index=True)
    admins: Mapped[dict[str, bool]] = mapped_column(JSONB, default=dict)
    members: Mapped[dict[str, bool]] = mapped_column(JSONB, default=dict)

class IntegrationConfig(BaseModel):
    __tablename__ = "integration_configs"

    workspace_id: Mapped[str] = mapped_column(String, index=True)
    platform: Mapped[PlatformEnum] = mapped_column(SQLEnum(PlatformEnum))
    access_token: Mapped[str] = mapped_column(String)
    refresh_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    expires_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    meta_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

class BriefingItem(BaseModel):
    __tablename__ = "briefing_items"

    workspace_id: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="welcome")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
