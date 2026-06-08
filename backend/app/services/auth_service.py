from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole, WorkspaceMemberStatus
from app.db.rag_db import rag_db_manager
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
                # 1. Tạo mới Workspace
                new_ws = Workspace(
                    name=f"{user.full_name}'s Workspace",
                    owner_uid=user.firebase_uid
                )
                db.add(new_ws)
                await db.flush()  # flush để lấy new_ws.id
                
                # 2. Tạo WorkspaceMember (owner)
                member = WorkspaceMember(
                    workspace_id=new_ws.id,
                    user_uid=user.firebase_uid,
                    role=WorkspaceRole.owner,
                    status=WorkspaceMemberStatus.active
                )
                db.add(member)
                
                # 3. Cập nhật current_workspace_id của user
                user.current_workspace_id = str(new_ws.id)
                await db.commit()
                await db.refresh(user)
                logger.info(f"Default workspace {new_ws.id} created for user {firebase_uid}")
                
                # 4. Kích hoạt tạo phân vùng RAG trong flae_knowledge_db
                try:
                    await rag_db_manager.create_workspace_partition(str(new_ws.id))
                    logger.info(f"RAG partitions initialized for workspace {new_ws.id}")
                except Exception as ex:
                    logger.error(f"Failed to create RAG partition for workspace {new_ws.id}: {ex}")
            except Exception as e:
                logger.error(f"Failed to create default workspace for user {firebase_uid}: {e}")
                await db.rollback()

        logger.info(f"User synced successfully: firebase_uid={firebase_uid}, action={action}")
        return user


auth_service = AuthService()

