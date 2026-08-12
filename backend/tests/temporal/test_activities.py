from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import InvalidArgumentError
from app.services.workspaces.invitations import InvitationEmail
from app.temporal.activities.invitation import send_invitation_email


@pytest.mark.asyncio
async def test_send_invitation_email_invalid_id_raises_custom_error() -> None:
    with pytest.raises(InvalidArgumentError, match="Invalid invitation ID"):
        await send_invitation_email("invalid-uuid-format")


@pytest.mark.asyncio
async def test_send_invitation_email_delegates_and_logs_no_token() -> None:
    invitation_id = uuid4()
    message = InvitationEmail(
        recipient="new.member@example.com",
        subject="Invitation to Platform",
        body="Accept: http://localhost:4200/invite?token=secret-token",
    )
    db = MagicMock()
    session_context = AsyncMock()
    session_context.__aenter__.return_value = db
    session_context.__aexit__.return_value = False

    with (
        patch(
            "app.temporal.activities.invitation.AsyncSessionLocal",
            return_value=session_context,
        ),
        patch(
            "app.temporal.activities.invitation.InvitationNotificationService.build_email",
            new=AsyncMock(return_value=message),
        ) as build_email,
        patch("app.temporal.activities.invitation.logger") as logger,
    ):
        result = await send_invitation_email(str(invitation_id))

    assert result is True
    build_email.assert_awaited_once_with(db, invitation_id)
    logger.info.assert_called_once_with(
        "Invitation email prepared for %s", "new.member@example.com"
    )
    assert "secret-token" not in repr(logger.method_calls)
