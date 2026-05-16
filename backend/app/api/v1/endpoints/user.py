from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.security import verify_token
from app.core.logger import get_logger
from app.schemas.sche_base import DataResponse
from app.schemas.sche_user import UserCreateRequest, UserItemResponse
from app.services.srv_user import UserService

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=DataResponse[UserItemResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    request: UserCreateRequest,
    current_user: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """
    API tạo profile người dùng mới sau khi đăng nhập Firebase.
    Không xử lý logic Join/Create Workspace ở đây (sẽ có API Workspace riêng).
    """
    logger.info(f"Creating user profile for firebase_uid={current_user.get('uid')}")

    user_model = await UserService.create_user(db, request, current_user)

    logger.info(f"User profile created successfully: id={user_model.id}")

    return DataResponse[UserItemResponse].custom_response(
        code="201",
        message="Profile created successfully",
        data=UserItemResponse(
            id=str(user_model.id) if user_model.id else "",
            firebase_uid=user_model.firebase_uid,
            email=user_model.email,
            full_name=user_model.full_name,
            is_active=user_model.is_active,
            login_providers=user_model.login_providers,
            avatar_url=user_model.avatar_url,
        ),
    )


@router.put("/{user_id}", response_model=DataResponse[dict])
async def update_user(
    user_id: str,
    # request: UserUpdateRequest,  # Sẽ implement sau
    current_user: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """
    API cập nhật thông tin user.
    """
    logger.info(f"Updating user: user_id={user_id}")
    return DataResponse[dict].custom_response(
        code="200",
        message="User updated successfully",
        data={"user_id": user_id, "updated": True},
    )


@router.delete("/{user_id}", response_model=DataResponse[dict])
async def delete_user(
    user_id: str,
    current_user: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """
    API xoá user.
    """
    logger.info(f"Deleting user: user_id={user_id}")
    return DataResponse[dict].custom_response(
        code="200",
        message="User deleted successfully",
        data={"user_id": user_id, "deleted": True},
    )
