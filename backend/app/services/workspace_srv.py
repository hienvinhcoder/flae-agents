import uuid
from datetime import datetime, timezone
import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logger import get_logger
from app.models.workspace import Workspace, IntegrationConfig, UserWorkspace, WorkspaceRole, PlatformEnum, BriefingItem
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
    def _seed_workspace_data(workspace_id: str):
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
            briefing.save()
            
            logger.info(f"Successfully seeded data for workspace {workspace_id}")
            
        except Exception as e:
            logger.error(f"Error seeding data for workspace {workspace_id}: {e}")
            # Note: We continue even if seeding fails so the user can still use the workspace
            pass

    @staticmethod
    async def create_manual_workspace(request: WorkspaceManualCreateRequest, user_uid: str) -> Workspace:
        """Create a workspace manually without integration."""
        
        # 1. Create Workspace
        workspace = Workspace(
            name=request.name,
            industry=request.industry,
            description=request.description,
            website=request.website,
            platform=PlatformEnum.manual,
            owner_uid=user_uid
        )
        workspace.save()
        
        # Ensure we have the ID (firedantic generates it upon save if not provided)
        workspace_id = str(workspace.id)
        
        # 2. Assign Role in UserWorkspace mapping
        user_workspace = UserWorkspace(
            user_uid=user_uid,
            workspace_id=workspace_id,
            role=WorkspaceRole.owner
        )
        user_workspace.save()
        
        # 3. Seed data
        WorkspaceService._seed_workspace_data(workspace_id)
        
        logger.info(f"Manual workspace {workspace_id} created by user {user_uid}")
        
        return workspace

    @staticmethod
    async def get_oauth_url(platform: PlatformEnum, shop_domain: str | None = None) -> str:
        """Get the OAuth URL for the chosen platform."""
        # For this prototype, we'll return a mock URL. 
        # In a real app, you construct this using client_id and redirect_uri.
        if platform == PlatformEnum.haravan:
            if not shop_domain:
                raise HTTPException(status_code=400, detail="shop_domain is required for Haravan")
            client_id = settings.HARAVAN_CLIENT_ID
            redirect_uri = "https://your-domain.com/auth/callback" # Update appropriately
            return f"https://{shop_domain}/admin/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code"
        elif platform == PlatformEnum.kiotviet:
            client_id = settings.KIOTVIET_CLIENT_ID
            return f"https://id.kiotviet.vn/connect/authorize?client_id={client_id}&response_type=code"
        else:
            raise HTTPException(status_code=400, detail="Invalid platform for OAuth")

    @staticmethod
    async def handle_oauth_callback(request: OAuthCallbackRequest, user_uid: str) -> Workspace:
        """Handle the OAuth callback, exchange token, and create workspace."""
        # Note: In a real scenario, you exchange the code for token via HTTPX
        # Here we mock the HTTP call for demonstration, as we might not have real keys/secrets yet
        
        # Mock token exchange
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(...)
        
        access_token = "mock_access_token_123"
        refresh_token = "mock_refresh_token_123"
        shop_name = f"Shop from {request.platform.value}"
        platform_store_id = str(uuid.uuid4())
        
        # Prefix store id with platform to prevent ID collision across platforms
        workspace_id = f"{request.platform.value}_{platform_store_id}"
        
        # 1. Check if store is already integrated
        try:
            from firedantic.exceptions import ModelNotFoundError
            try:
                existing_workspace = Workspace.get_by_id(workspace_id)
                # Store exists
                if existing_workspace.owner_uid != user_uid:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Cửa hàng này đã được liên kết bởi một tài khoản khác."
                    )
                else:
                    # Same user re-authorizing, update token
                    existing_workspace.name = shop_name
                    existing_workspace.save()
                    
                    try:
                        config = IntegrationConfig.get_by_id(workspace_id)
                        config.access_token = WorkspaceService._encrypt_token(access_token) or ""
                        config.refresh_token = WorkspaceService._encrypt_token(refresh_token)
                        config.save()
                    except Exception:
                        pass # Should not happen if data is consistent
                        
                    logger.info(f"OAuth workspace {workspace_id} re-authorized by user {user_uid}")
                    return existing_workspace
            except ModelNotFoundError:
                pass # Proceed to create new
            except Exception as e:
                # Fallback for other Firedantic version exceptions
                if "not found" in str(e).lower() or type(e).__name__ == "ModelNotFoundError":
                    pass
                else:
                    raise e
        except HTTPException:
            raise
            
        # 2. Create Workspace
        workspace = Workspace(
            id=workspace_id,
            name=shop_name,
            platform=request.platform,
            platform_store_id=platform_store_id,
            owner_uid=user_uid
        )
        workspace.save()
        
        # 3. Save IntegrationConfig securely (1-1 relationship with Workspace)
        config = IntegrationConfig(
            id=workspace_id,
            workspace_id=workspace_id,
            platform=request.platform,
            access_token=WorkspaceService._encrypt_token(access_token) or "",
            refresh_token=WorkspaceService._encrypt_token(refresh_token)
        )
        config.save()
        
        # 4. Assign Role
        user_workspace = UserWorkspace(
            user_uid=user_uid,
            workspace_id=workspace_id,
            role=WorkspaceRole.owner
        )
        user_workspace.save()
        
        # 5. Seed data
        WorkspaceService._seed_workspace_data(workspace_id)
        
        logger.info(f"OAuth workspace {workspace_id} created by user {user_uid} for {request.platform}")
        
        return workspace
