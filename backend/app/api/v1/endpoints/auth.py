from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.auth import UserSyncRequest
from app.schemas.sche_base import DataResponse
from app.schemas.sche_user import UserItemResponse
from app.services.auth_service import auth_service
from app.core.security import get_current_user_uid
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "/sync-user",
    response_model=DataResponse[UserItemResponse],
    status_code=status.HTTP_200_OK,
)
async def sync_user(
    sync_data: UserSyncRequest,
    firebase_uid: str = Depends(get_current_user_uid),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync user data từ Firebase Auth vào Database.
    Yêu cầu Firebase JWT token hợp lệ trong Authorization header.
    """
    logger.info(f"Syncing user with firebase_uid={firebase_uid}, email={sync_data.email}")

    user = await auth_service.sync_firebase_user(db, firebase_uid, sync_data)

    logger.info(f"User synced successfully: firebase_uid={firebase_uid}")

    return DataResponse[UserItemResponse].success_response(
        data=UserItemResponse(
            id=str(user.id) if user.id else "",
            firebase_uid=user.firebase_uid,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            login_providers=user.login_providers,
        )
    )
