import uuid

from temporalio import activity

from app.core.exceptions import InvalidArgumentError
from app.core.logger import get_logger
from app.db.database import AsyncSessionLocal
from app.services.workspaces.invitations import InvitationNotificationService

logger = get_logger(__name__)


@activity.defn
async def send_invitation_email(invitation_id: str) -> bool:
    try:
        parsed_id = uuid.UUID(invitation_id)
    except ValueError as error:
        raise InvalidArgumentError("Invalid invitation ID") from error

    async with AsyncSessionLocal() as db:
        message = await InvitationNotificationService.build_email(db, parsed_id)
    logger.info("Invitation email prepared for %s", message.recipient)
    return True
