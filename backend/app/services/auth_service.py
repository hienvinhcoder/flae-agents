from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from app.models.user import User
from app.schemas.auth import UserSyncRequest
from app.core.logger import get_logger

logger = get_logger(__name__)


class AuthService:
    @staticmethod
    async def sync_firebase_user(db: AsyncSession, firebase_uid: str, sync_data: UserSyncRequest) -> User:
        """
        Sync user data from Firebase to Database.
        If user exists, update if necessary.
        If user does not exist, create a new one.
        Ensures the user has at least one active workspace (creates a default one if not).
        """
        try:
            result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
            user = result.scalar_one()
        except NoResultFound:
            user = None

        if user:
            action = "updated"
            needs_save = False

            if sync_data.login_provider not in user.login_providers:
                # With JSONB/ARRAY, creating a new list ensures change detection
                user.login_providers = user.login_providers + [sync_data.login_provider]
                needs_save = True

            if not user.full_name and sync_data.full_name:
                user.full_name = sync_data.full_name
                needs_save = True
            if not user.avatar_url and sync_data.avatar_url:
                user.avatar_url = sync_data.avatar_url
                needs_save = True

            if needs_save:
                await db.commit()
                await db.refresh(user)
        else:
            user = User(
                firebase_uid=firebase_uid,
                email=sync_data.email,
                full_name=sync_data.full_name,
                avatar_url=sync_data.avatar_url,
                login_providers=[sync_data.login_provider],
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            action = "created"

        # Khởi tạo workspace mặc định nếu chưa thuộc bất kỳ workspace nào
        if not user.current_workspace_id:
            logger.info(f"User {firebase_uid} has no current workspace. Creating a default one.")
            try:
                from app.services.workspace_srv import WorkspaceService
                await WorkspaceService.create_default_workspace(db, firebase_uid)
                await db.refresh(user)
            except Exception as e:
                logger.error(f"Failed to create default workspace for user {firebase_uid}: {e}")
                await db.rollback()

        logger.info(f"User synced successfully: firebase_uid={firebase_uid}, action={action}")
        return user


auth_service = AuthService()

