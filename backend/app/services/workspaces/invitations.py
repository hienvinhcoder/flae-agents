"""Workspace invitation notification preparation."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation


@dataclass(frozen=True, slots=True)
class InvitationEmail:
    recipient: str
    subject: str
    body: str


class InvitationNotificationService:
    @staticmethod
    async def build_email(db: AsyncSession, invitation_id: UUID) -> InvitationEmail:
        invitation_result = await db.execute(
            select(WorkspaceInvitation).where(WorkspaceInvitation.id == invitation_id)
        )
        invitation = invitation_result.scalar_one_or_none()
        if invitation is None:
            raise ResourceNotFoundError("Workspace invitation not found")

        workspace_result = await db.execute(
            select(Workspace).where(Workspace.id == invitation.workspace_id)
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace is None:
            raise ResourceNotFoundError("Invitation workspace not found")

        inviter_result = await db.execute(
            select(User).where(User.firebase_uid == invitation.invited_by)
        )
        inviter = inviter_result.scalar_one_or_none()
        inviter_name = (
            inviter.full_name if inviter is not None else "A workspace administrator"
        )
        inviter_email = inviter.email if inviter is not None else invitation.invited_by
        role = getattr(invitation.role, "value", invitation.role)
        body = (
            f'You have been invited to join the "{workspace.name}" workspace on '
            f"FLAE Agents by {inviter_name} ({inviter_email}) with the role: {role}.\n\n"
            "Accept the invitation: "
            f"http://localhost:4200/invite?token={invitation.token}\n\n"
            f"Expires: {invitation.expires_at.isoformat()}"
        )
        return InvitationEmail(
            recipient=invitation.email,
            subject=f"Invitation to {workspace.name}",
            body=body,
        )
