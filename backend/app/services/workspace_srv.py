import uuid
from datetime import datetime, timezone
import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound

from app.core.config import settings
from app.core.logger import get_logger
from app.models.workspace import Workspace, WorkspaceRole, PlatformEnum
from app.schemas.sche_workspace import WorkspaceManualCreateRequest

logger = get_logger(__name__)

class WorkspaceService:
    @staticmethod
    def _get_cipher():
        key = settings.ENCRYPTION_KEY
        if not key:
            # Fallback for local testing if not set
            key = Fernet.generate_key().decode("utf-8")
        return Fernet(key.encode("utf-8"))
        
    @staticmethod
    def _encrypt_token(token: str | None) -> str | None:
        if not token:
            return token
        cipher = WorkspaceService._get_cipher()
        return cipher.encrypt(token.encode("utf-8")).decode("utf-8")

    @staticmethod
    async def update_current_workspace(db: AsyncSession, user_uid: str, workspace_id: str):
        """Update user's current_workspace_id."""
        from app.models.user import User
        try:
            result = await db.execute(select(User).where(User.firebase_uid == user_uid))
            user = result.scalar_one()
            user.current_workspace_id = workspace_id
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to update current_workspace_id for user {user_uid}: {e}")

    @staticmethod
    async def create_manual_workspace(db: AsyncSession, request: WorkspaceManualCreateRequest, user_uid: str) -> Workspace:
        """Create a workspace manually without integration."""
        
        # 1. Create Workspace
        workspace = Workspace(
            name=request.name,
            industry=request.industry,
            description=request.description,
            website=request.website,
            platform=PlatformEnum.manual,
            owner_uid=user_uid,
            admins={user_uid: True}
        )
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
        
        workspace_id = str(workspace.id)
        
        # 2. Update user's current_workspace_id
        await WorkspaceService.update_current_workspace(db, user_uid, workspace_id)
        
        logger.info(f"Manual workspace {workspace_id} created by user {user_uid}")
        
        return workspace


