import uuid
from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import String, Enum as SQLEnum, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"

class WorkspaceMemberStatus(str, Enum):
    active = "active"
    suspended = "suspended"

class InvitationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"

class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_uid: Mapped[str] = mapped_column(String, index=True, nullable=False)  # Firebase UID của Owner

class WorkspaceMember(BaseModel):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    user_uid: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.firebase_uid", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        SQLEnum(WorkspaceRole),
        default=WorkspaceRole.member,
        nullable=False
    )
    status: Mapped[WorkspaceMemberStatus] = mapped_column(
        SQLEnum(WorkspaceMemberStatus),
        default=WorkspaceMemberStatus.active,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_uid", name="uq_workspace_member"),
    )

class WorkspaceInvitation(BaseModel):
    __tablename__ = "workspace_invitations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(
        SQLEnum(WorkspaceRole),
        default=WorkspaceRole.member,
        nullable=False
    )
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    invited_by: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.firebase_uid", ondelete="CASCADE"),
        nullable=False
    )
    status: Mapped[InvitationStatus] = mapped_column(
        SQLEnum(InvitationStatus),
        default=InvitationStatus.pending,
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
