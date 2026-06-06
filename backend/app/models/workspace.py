from enum import Enum
from typing import Optional, Any
from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class PlatformEnum(str, Enum):
    manual = "manual"

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


