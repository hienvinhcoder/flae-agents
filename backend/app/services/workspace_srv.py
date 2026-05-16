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
from app.models.workspace import Workspace, IntegrationConfig, WorkspaceRole, PlatformEnum, BriefingItem
from app.schemas.sche_workspace import WorkspaceManualCreateRequest, OAuthCallbackRequest

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
    async def _seed_workspace_data(db: AsyncSession, workspace_id: str):
        """Seed default briefing item for a new workspace."""
        try:
            # Create welcome briefing
            briefing = BriefingItem(
                workspace_id=workspace_id,
                title="Chào mừng đến với FLAE Workspace",
                content="Cảm ơn bạn đã sử dụng nền tảng của chúng tôi. Hãy bắt đầu bằng việc thiết lập gian hàng.",
                type="welcome",
                is_read=False
            )
            db.add(briefing)
            await db.commit()
            
            logger.info(f"Successfully seeded data for workspace {workspace_id}")
        except Exception as e:
            logger.error(f"Error seeding data for workspace {workspace_id}: {e}")

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
        
        # 3. Seed data
        await WorkspaceService._seed_workspace_data(db, workspace_id)
        
        logger.info(f"Manual workspace {workspace_id} created by user {user_uid}")
        
        return workspace

    @staticmethod
    async def get_oauth_url(platform: PlatformEnum, shop_domain: str | None = None) -> str:
        """Get the OAuth URL for the chosen platform."""
        if platform == PlatformEnum.haravan:
            if not shop_domain:
                raise HTTPException(status_code=400, detail="shop_domain is required for Haravan")
            client_id = settings.HARAVAN_CLIENT_ID
            redirect_uri = "https://your-domain.com/auth/callback" 
            return f"https://{shop_domain}/admin/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code"
        elif platform == PlatformEnum.kiotviet:
            client_id = settings.KIOTVIET_CLIENT_ID
            return f"https://id.kiotviet.vn/connect/authorize?client_id={client_id}&response_type=code"
        else:
            raise HTTPException(status_code=400, detail="Invalid platform for OAuth")

    @staticmethod
    async def handle_oauth_callback(db: AsyncSession, request: OAuthCallbackRequest, user_uid: str) -> Workspace:
        """Handle the OAuth callback, exchange token, and create workspace."""
        access_token = "mock_access_token_123"
        refresh_token = "mock_refresh_token_123"
        shop_name = f"Shop from {request.platform.value}"
        platform_store_id = str(uuid.uuid4())
        
        # 1. Check if store is already integrated
        try:
            result = await db.execute(
                select(Workspace).where(
                    Workspace.platform == request.platform,
                    Workspace.platform_store_id == platform_store_id
                )
            )
            existing_workspace = result.scalar_one()
            
            # Store exists
            if existing_workspace.owner_uid != user_uid:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cửa hàng này đã được liên kết bởi một tài khoản khác."
                )
            
            # Same user re-authorizing, update token
            existing_workspace.name = shop_name
            await db.commit()
            
            try:
                config_result = await db.execute(select(IntegrationConfig).where(IntegrationConfig.workspace_id == str(existing_workspace.id)))
                config = config_result.scalar_one()
                config.access_token = WorkspaceService._encrypt_token(access_token) or ""
                config.refresh_token = WorkspaceService._encrypt_token(refresh_token)
                await db.commit()
            except NoResultFound:
                pass
                
            logger.info(f"OAuth workspace {existing_workspace.id} re-authorized by user {user_uid}")
            return existing_workspace
        except NoResultFound:
            pass
            
        # 2. Create Workspace
        workspace = Workspace(
            name=shop_name,
            platform=request.platform,
            platform_store_id=platform_store_id,
            owner_uid=user_uid,
            admins={user_uid: True}
        )
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
        
        workspace_id = str(workspace.id)
        
        # 3. Save IntegrationConfig securely
        config = IntegrationConfig(
            workspace_id=workspace_id,
            platform=request.platform,
            access_token=WorkspaceService._encrypt_token(access_token) or "",
            refresh_token=WorkspaceService._encrypt_token(refresh_token)
        )
        db.add(config)
        await db.commit()
        
        # 4. Seed data
        await WorkspaceService._seed_workspace_data(db, workspace_id)
        
        # 5. Update user's current_workspace_id
        await WorkspaceService.update_current_workspace(db, user_uid, workspace_id)
        
        logger.info(f"OAuth workspace {workspace_id} created by user {user_uid} for {request.platform}")
        
        return workspace
